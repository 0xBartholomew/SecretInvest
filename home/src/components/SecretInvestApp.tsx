import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract, formatEther, parseEther } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS, TOKENS } from '../config/contracts';

type Position = {
  token: string;
  direction: string; // bytes32 as hex
  quantity: string;  // bytes32 as hex
  openPrice: bigint;
  openedAt: bigint;
  active: boolean;
};

export function SecretInvestApp() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading } = useZamaInstance();

  const [encBalance, setEncBalance] = useState<string>('0x');
  const [decBalance, setDecBalance] = useState<bigint | null>(null);
  const [token, setToken] = useState<string>(TOKENS[0]);
  const [tokenPrice, setTokenPrice] = useState<bigint>(0n);
  const [direction, setDirection] = useState<1 | 2>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [active, setActive] = useState<boolean>(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [unitPrice, setUnitPrice] = useState<bigint>(0n);
  const [busy, setBusy] = useState<string>('');
  const [owner, setOwner] = useState<`0x${string}` | null>(null);
  const [newTokenPrice, setNewTokenPrice] = useState<string>('0');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState<{ direction?: number; quantity?: number }>({});

  const viemContract = useMemo(() => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI as any,
  }), []);

  async function refresh() {
    if (!publicClient || !address) return;
    const [bal, has, own] = await Promise.all([
      publicClient.readContract({ ...viemContract, functionName: 'getEncryptedBalance', args: [address] }) as Promise<string>,
      publicClient.readContract({ ...viemContract, functionName: 'hasActivePosition', args: [address] }) as Promise<boolean>,
      publicClient.readContract({ ...viemContract, functionName: 'owner', args: [] }) as Promise<`0x${string}`>,
    ]);
    setEncBalance(bal as any);
    setDecBalance(null);
    setActive(has);
    setOwner(own);
    const up = await publicClient.readContract({ ...viemContract, functionName: 'UNIT_PRICE_WEI', args: [] }) as bigint;
    setUnitPrice(up);
    if (has) {
      const res = await publicClient.readContract({ ...viemContract, functionName: 'getPosition', args: [address] }) as any[];
      const pos: Position = {
        token: res[0],
        direction: res[1],
        quantity: res[2],
        openPrice: res[3],
        openedAt: res[4],
        active: res[5],
      } as any;
      setPosition(pos);
      const price = await publicClient.readContract({ ...viemContract, functionName: 'getTokenPrice', args: [res[0]] }) as bigint;
      setTokenPrice(price);
    } else {
      setPosition(null);
    }
    const tp = await publicClient.readContract({ ...viemContract, functionName: 'getTokenPrice', args: [token] }) as bigint;
    setTokenPrice(tp);
  }

  useEffect(() => { refresh(); }, [address, publicClient]);
  useEffect(() => { refresh(); }, [token]);

  async function getContractWithSigner(): Promise<Contract | null> {
    const signer = await signerPromise;
    if (!signer) return null;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
  }

  async function handleDeposit(amountEth: string) {
    setBusy('Depositing...');
    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
      const tx = await contract.deposit({ value: parseEther(amountEth) });
      await tx.wait();
      await refresh();
    } finally { setBusy(''); }
  }

  async function handleWithdraw(amountEth: string) {
    setBusy('Withdrawing...');
    try {
      const c = await getContractWithSigner(); if (!c) throw new Error('No signer');
      const tx = await c.withdraw(parseEther(amountEth));
      await tx.wait();
      await refresh();
    } finally { setBusy(''); }
  }

  async function handleOpen() {
    if (!address) return;
    if (!instance) throw new Error('Encryption not ready');
    setBusy('Opening position...');
    try {
      const stake = unitPrice * BigInt(quantity);
      if (stake > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('Stake too large to encrypt as 64-bit safely');
      }
      const enc = await instance
        .createEncryptedInput(CONTRACT_ADDRESS, address)
        .add32(direction)
        .add32(quantity)
        .add64(Number(stake))
        .encrypt();

      const c = await getContractWithSigner(); if (!c) throw new Error('No signer');
      const tx = await c.openPosition(token, enc.handles[0], enc.handles[1], enc.handles[2], enc.inputProof);
      await tx.wait();
      await refresh();
    } finally { setBusy(''); }
  }

  async function handleClose() {
    if (!address) return;
    setBusy('Closing position...');
    try {
      const c = await getContractWithSigner(); if (!c) throw new Error('No signer');
      const tx = await c.closePosition(quantity, direction);
      await tx.wait();
      await refresh();
    } finally { setBusy(''); }
  }

  async function handleSetTokenPrice() {
    setBusy('Setting token price...');
    try {
      const c = await getContractWithSigner(); if (!c) throw new Error('No signer');
      const tx = await c.setTokenPrice(token, BigInt(newTokenPrice));
      await tx.wait();
      await refresh();
    } finally { setBusy(''); }
  }

  async function handleDecryptBalance() {
    if (!address || !instance) return;
    try {
      setBusy('Decrypting balance...');
      const handle = encBalance as unknown as string;
      const pairs = [{ handle, contractAddress: CONTRACT_ADDRESS }];
      const keypair = await instance.generateKeypair();
      // build typed data and sign with wallet
      const start = Math.floor(Date.now() / 1000);
      const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], start, 1);
      const signer = await signerPromise; if (!signer) throw new Error('No signer');
      const filteredTypes = Object.fromEntries(Object.entries(eip712.types).filter(([k]) => k !== 'EIP712Domain')) as any;
      // @ts-ignore ethers v6 signTypedData
      const signature: string = await signer.signTypedData(eip712.domain, filteredTypes, eip712.message);
      const res = await instance.userDecrypt(
        pairs as any,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x',''),
        [CONTRACT_ADDRESS],
        address,
        start,
        1
      );
      const v = BigInt(res[handle] || 0);
      setDecBalance(v);
    } catch (e: any) {
      console.error(e);
      alert('Decrypt balance failed: ' + (e?.message || String(e)));
    } finally {
      setBusy('');
    }
  }

  async function handleDecrypt() {
    if (!position || !address || !instance) return;
    setIsDecrypting(true);
    try {
      const directionHandle = (position.direction as unknown as string);
      const quantityHandle = (position.quantity as unknown as string);

      const handleContractPairs = [
        { handle: directionHandle, contractAddress: CONTRACT_ADDRESS },
        { handle: quantityHandle, contractAddress: CONTRACT_ADDRESS },
      ];

      const keypair = await instance.generateKeypair();
      const start = Math.floor(Date.now() / 1000);
      const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], start, 1);
      const signer = await signerPromise; if (!signer) throw new Error('No signer');
      const filteredTypes = Object.fromEntries(Object.entries(eip712.types).filter(([k]) => k !== 'EIP712Domain')) as any;
      // @ts-ignore ethers v6 signTypedData
      const signature: string = await signer.signTypedData(eip712.domain, filteredTypes, eip712.message);

      const result = await instance.userDecrypt(
        handleContractPairs as any,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x',''),
        [CONTRACT_ADDRESS],
        address,
        start,
        1
      );

      const dir = Number(result[directionHandle] ?? 0);
      const qty = Number(result[quantityHandle] ?? 0);
      setDecrypted({ direction: dir, quantity: qty });
    } catch (e: any) {
      console.error('Decrypt failed', e);
      alert('Decrypt failed: ' + (e?.message || String(e)));
    } finally {
      setIsDecrypting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
          padding: '20px 0'
        }}>
          <h1 style={{
            margin: 0,
            color: '#fff',
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>🔐 Secret PerpDex</h1>
          <ConnectButton />
        </header>

        {!address ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: 60,
            borderRadius: 20,
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
            <h2 style={{ fontSize: 28, marginBottom: 12, color: '#333' }}>Welcome to SecretInvest</h2>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>Connect your wallet to start trading with encrypted positions</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Balance Card */}
            <section style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: 32,
              borderRadius: 20,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 28, marginRight: 12 }}>💰</span>
                <h3 style={{ margin: 0, fontSize: 24, color: '#333' }}>Balance</h3>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 24,
                borderRadius: 12,
                marginBottom: 20
              }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginBottom: 8 }}>Platform Balance</div>
                <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                  {decBalance !== null ? `${formatEther(decBalance)} ETH` : '🔒 Encrypted'}
                </div>
                {decBalance === null && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}>Click "Decrypt Balance" to reveal</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleDeposit('0.005')}
                  disabled={!!busy}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: '14px 24px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseOver={(e) => !busy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  💵 Deposit 0.005 ETH
                </button>
                <button
                  onClick={() => handleWithdraw('0.005')}
                  disabled={!!busy}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: '14px 24px',
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseOver={(e) => !busy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  💸 Withdraw 0.005 ETH
                </button>
                <button
                  onClick={handleDecryptBalance}
                  disabled={!!busy || !instance}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: '14px 24px',
                    background: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: (busy || !instance) ? 'not-allowed' : 'pointer',
                    opacity: (busy || !instance) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseOver={(e) => !(busy || !instance) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  🔓 Decrypt Balance
                </button>
              </div>
            </section>

            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
              {/* Open Position Card */}
              <section style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: 32,
                borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 28, marginRight: 12 }}>📈</span>
                  <h3 style={{ margin: 0, fontSize: 24, color: '#333' }}>Open Position</h3>
                </div>

                <div style={{
                  background: 'rgba(102, 126, 234, 0.1)',
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 20,
                  fontSize: 14,
                  color: '#667eea',
                  fontWeight: 500
                }}>
                  🔒 Your position direction and quantity will be encrypted
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <label style={{ display: 'grid', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Token Address</span>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      {TOKENS.map((t) => (
                        <option key={t} value={t}>{t.slice(0, 10)}...{t.slice(-8)}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 13, color: '#888' }}>
                      Token price: {tokenPrice.toString()} wei
                    </div>
                  </label>

                  {owner && address?.toLowerCase() === owner.toLowerCase() && (
                    <div style={{
                      background: '#fef3c7',
                      padding: 12,
                      borderRadius: 8,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center'
                    }}>
                      <input
                        placeholder="Set token price (wei)"
                        value={newTokenPrice}
                        onChange={(e) => setNewTokenPrice(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #fbbf24',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={handleSetTokenPrice}
                        disabled={!!busy}
                        style={{
                          padding: '8px 16px',
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: busy ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Set Price
                      </button>
                    </div>
                  )}

                  <label style={{ display: 'grid', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Direction</span>
                    <select
                      value={direction}
                      onChange={(e) => setDirection(Number(e.target.value) as 1 | 2)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      <option value={1}>📈 Long</option>
                      <option value={2}>📉 Short</option>
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Quantity (units)</span>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                  </label>

                  <div style={{
                    background: '#f3f4f6',
                    padding: 16,
                    borderRadius: 10,
                    display: 'grid',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: '#666' }}>Unit price:</span>
                      <span style={{ fontWeight: 600, color: '#333' }}>{formatEther(unitPrice)} ETH</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                      <span style={{ color: '#666', fontWeight: 600 }}>Total cost:</span>
                      <span style={{ fontWeight: 700, color: '#667eea' }}>{formatEther(unitPrice * BigInt(quantity))} ETH</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpen}
                    disabled={!!busy || zamaLoading}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: (busy || zamaLoading) ? 'not-allowed' : 'pointer',
                      opacity: (busy || zamaLoading) ? 0.5 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseOver={(e) => !(busy || zamaLoading) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    🚀 Open Position
                  </button>
                </div>
              </section>

              {/* Active Position Card */}
              <section style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: 32,
                borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 28, marginRight: 12 }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: 24, color: '#333' }}>Active Position</h3>
                </div>

                {!active || !position ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#999'
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                    <p style={{ fontSize: 16, margin: 0 }}>No active position</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{
                      background: '#f3f4f6',
                      padding: 16,
                      borderRadius: 10,
                      display: 'grid',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#666' }}>Token:</span>
                        <span style={{ fontWeight: 600, color: '#333', fontSize: 12 }}>{position.token.slice(0, 10)}...{position.token.slice(-8)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#666' }}>Open price:</span>
                        <span style={{ fontWeight: 600, color: '#333' }}>{position.openPrice.toString()} wei</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#666' }}>Opened at:</span>
                        <span style={{ fontWeight: 600, color: '#333', fontSize: 12 }}>{new Date(Number(position.openedAt) * 1000).toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      padding: 16,
                      borderRadius: 10,
                      display: 'grid',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>🔒 Direction:</span>
                        <span style={{ fontWeight: 700, color: '#8b5cf6' }}>
                          {decrypted.direction !== undefined ? (
                            decrypted.direction === 1 ? '📈 Long' : '📉 Short'
                          ) : '***'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>🔒 Quantity:</span>
                        <span style={{ fontWeight: 700, color: '#8b5cf6' }}>
                          {decrypted.quantity !== undefined ? `${decrypted.quantity} units` : '***'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      <button
                        onClick={handleClose}
                        disabled={!!busy}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: busy ? 'not-allowed' : 'pointer',
                          opacity: busy ? 0.5 : 1,
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseOver={(e) => !busy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                      >
                        ❌ Close Position
                      </button>
                      <button
                        onClick={handleDecrypt}
                        disabled={isDecrypting || !instance}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: '#8b5cf6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: (isDecrypting || !instance) ? 'not-allowed' : 'pointer',
                          opacity: (isDecrypting || !instance) ? 0.5 : 1,
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                        onMouseOver={(e) => !(isDecrypting || !instance) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                      >
                        🔓 Decrypt Position
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {busy && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: '#fff',
                  padding: '32px 48px',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{busy}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

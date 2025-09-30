import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';

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

  const [balance, setBalance] = useState<bigint>(0n);
  const [token, setToken] = useState<string>('0x0000000000000000000000000000000000000001');
  const [tokenPrice, setTokenPrice] = useState<bigint>(0n);
  const [direction, setDirection] = useState<1 | 2>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [active, setActive] = useState<boolean>(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [unitPrice, setUnitPrice] = useState<bigint>(0n);
  const [busy, setBusy] = useState<string>('');
  const [owner, setOwner] = useState<`0x${string}` | null>(null);
  const [newTokenPrice, setNewTokenPrice] = useState<string>('0');

  const viemContract = useMemo(() => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI as any,
  }), []);

  async function refresh() {
    if (!publicClient || !address) return;
    const [bal, has, own] = await Promise.all([
      publicClient.readContract({ ...viemContract, functionName: 'balances', args: [address] }) as Promise<bigint>,
      publicClient.readContract({ ...viemContract, functionName: 'hasActivePosition', args: [address] }) as Promise<boolean>,
      publicClient.readContract({ ...viemContract, functionName: 'owner' }) as Promise<`0x${string}`>,
    ]);
    setBalance(bal);
    setActive(has);
    setOwner(own);
    const up = await publicClient.readContract({ ...viemContract, functionName: 'UNIT_PRICE_WEI' }) as bigint;
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
      const enc = await instance
        .createEncryptedInput(CONTRACT_ADDRESS, address)
        .add32(direction)
        .add32(quantity)
        .encrypt();

      const c = await getContractWithSigner(); if (!c) throw new Error('No signer');
      const tx = await c.openPosition(token, enc.handles[0], enc.handles[1], enc.inputProof);
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

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>SecretInvest</h1>
        <ConnectButton />
      </header>

      {!address ? (
        <p>Please connect your wallet.</p>
      ) : (
        <>
          <section style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #eee' }}>
            <h3>Balance</h3>
            <p>Platform balance: {formatEther(balance)} ETH</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleDeposit('0.01')} disabled={!!busy}>Deposit 0.01 ETH</button>
              <button onClick={() => handleWithdraw('0.005')} disabled={!!busy}>Withdraw 0.005 ETH</button>
            </div>
          </section>

          <section style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #eee' }}>
            <h3>Open Position</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>
                Token Address
                <input style={{ width: '100%' }} value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
              {owner && address?.toLowerCase() === owner.toLowerCase() && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input placeholder="Set token price (wei)" value={newTokenPrice} onChange={(e) => setNewTokenPrice(e.target.value)} />
                  <button onClick={handleSetTokenPrice} disabled={!!busy}>Set Price</button>
                </div>
              )}
              <label>
                Direction
                <select value={direction} onChange={(e) => setDirection(Number(e.target.value) as 1 | 2)}>
                  <option value={1}>Long (1)</option>
                  <option value={2}>Short (2)</option>
                </select>
              </label>
              <label>
                Quantity (units)
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </label>
              <div>
                <p>Unit price: {formatEther(unitPrice)} ETH</p>
                <p>Cost: {formatEther(unitPrice * BigInt(quantity))} ETH</p>
              </div>
              <button onClick={handleOpen} disabled={!!busy || zamaLoading}>Open</button>
            </div>
          </section>

          <section style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #eee' }}>
            <h3>Active Position</h3>
            {!active || !position ? (
              <p>No active position.</p>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                <div>Token: {position.token}</div>
                <div>Open price: {position.openPrice.toString()}</div>
                <div>Opened at: {new Date(Number(position.openedAt) * 1000).toLocaleString()}</div>
                <div>Encrypted direction: {position.direction}</div>
                <div>Encrypted quantity: {position.quantity}</div>
                <button onClick={handleClose} disabled={!!busy}>Close Position</button>
              </div>
            )}
          </section>

          {busy && <p>{busy}</p>}
        </>
      )}
    </div>
  );
}

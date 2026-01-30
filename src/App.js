import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowDownUp, Wallet, Settings, ChevronDown, Info, ExternalLink, X, Zap, Clock, Server, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import './App.css';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

function App() {
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellToken, setSellToken] = useState('SOL');
  const [buyToken, setBuyToken] = useState('USDC');
  const [wallet, setWallet] = useState(null);
  const [balances, setBalances] = useState({});
  const [tokenPrices, setTokenPrices] = useState({});
  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quoteData, setQuoteData] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txSignature, setTxSignature] = useState(null);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    slippage: 0.5,
    deadline: 20,
    rpcEndpoint: 'mainnet',
    autoRefresh: true,
    soundEffects: false,
  });

  const connection = useMemo(() => new Connection(SOLANA_RPC), []);

  const tokens = useMemo(() => ({
    SOL: { 
      name: 'Solana', 
      symbol: 'SOL', 
      address: TOKEN_ADDRESSES.SOL,
      decimals: 9,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.5 16.5l4.5-4.5 4.5 4.5M5.5 7.5l4.5 4.5 4.5-4.5M14.5 12l4.5-4.5M9.5 12L5 16.5"/>
        </svg>
      ),
      color: '#000000' 
    },
    USDC: { 
      name: 'USD Coin', 
      symbol: 'USDC', 
      address: TOKEN_ADDRESSES.USDC,
      decimals: 6,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <text x="12" y="16" fontSize="12" textAnchor="middle" fill="currentColor" fontWeight="bold">$</text>
        </svg>
      ),
      color: '#000000' 
    },
    USDT: { 
      name: 'Tether USD', 
      symbol: 'USDT', 
      address: TOKEN_ADDRESSES.USDT,
      decimals: 6,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <text x="12" y="16" fontSize="11" textAnchor="middle" fill="currentColor" fontWeight="bold">₮</text>
        </svg>
      ),
      color: '#000000' 
    },
    BONK: { 
      name: 'Bonk', 
      symbol: 'BONK', 
      address: TOKEN_ADDRESSES.BONK,
      decimals: 5,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="16" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="7" cy="9" r="1" fill="currentColor"/>
          <circle cx="15" cy="13" r="1" fill="currentColor"/>
        </svg>
      ),
      color: '#000000' 
    },
  }), []);

  const rpcEndpoints = {
    mainnet: { name: 'Solana Mainnet', url: 'https://api.mainnet-beta.solana.com', speed: 'Standard' },
    quicknode: { name: 'QuickNode (Faster)', url: 'https://api.mainnet-beta.solana.com', speed: 'Fast' },
    helius: { name: 'Helius (Premium)', url: 'https://api.mainnet-beta.solana.com', speed: 'Ultra Fast' },
  };

  // Settings handlers
  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSlippageChange = (value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 50) {
      handleSettingsChange('slippage', numValue);
    }
  };

  const handleDeadlineChange = (value) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 60) {
      handleSettingsChange('deadline', numValue);
    }
  };

  const resetSettings = () => {
    setSettings({
      slippage: 0.5,
      deadline: 20,
      rpcEndpoint: 'mainnet',
      autoRefresh: true,
      soundEffects: false,
    });
  };

  const fetchTokenPrices = async () => {
    try {
      const ids = 'solana,usd-coin,tether,bonk';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      
      setTokenPrices({
        SOL: { price: data.solana?.usd || 0, change: data.solana?.usd_24h_change || 0 },
        USDC: { price: data['usd-coin']?.usd || 1, change: data['usd-coin']?.usd_24h_change || 0 },
        USDT: { price: data.tether?.usd || 1, change: data.tether?.usd_24h_change || 0 },
        BONK: { price: data.bonk?.usd || 0, change: data.bonk?.usd_24h_change || 0 },
      });
    } catch (err) {
      console.error('Error fetching prices:', err);
      setTokenPrices({
        SOL: { price: 142, change: 0 },
        USDC: { price: 1, change: 0 },
        USDT: { price: 1, change: 0 },
        BONK: { price: 0.000027, change: 0 },
      });
    }
  };

  const getProvider = () => {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    window.open('https://phantom.app/', '_blank');
  };

  const connectWallet = async () => {
    try {
      const provider = getProvider();
      if (!provider) {
        alert('Please install Phantom wallet from phantom.app');
        return;
      }

      const resp = await provider.connect();
      setWallet(resp.publicKey.toString());
      await fetchBalances(resp.publicKey);
      
      if (settings.soundEffects) {
        console.log('Wallet connected sound');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = getProvider();
      if (provider) {
        await provider.disconnect();
      }
      setWallet(null);
      setBalances({});
      setTxSignature(null);
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
    }
  };

  const fetchBalances = useCallback(async (publicKey) => {
    try {
      const pubKey = new PublicKey(publicKey);
      
      const solBalance = await connection.getBalance(pubKey);
      const newBalances = {
        SOL: solBalance / 1e9
      };

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      tokenAccounts.value.forEach((accountInfo) => {
        const parsedInfo = accountInfo.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const amount = parsedInfo.tokenAmount.uiAmount;

        Object.entries(TOKEN_ADDRESSES).forEach(([symbol, address]) => {
          if (mint === address) {
            newBalances[symbol] = amount || 0;
          }
        });
      });

      Object.keys(tokens).forEach(symbol => {
        if (!(symbol in newBalances)) {
          newBalances[symbol] = 0;
        }
      });

      setBalances(newBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  }, [connection, tokens]);

  const getQuote = useCallback(async (inputMint, outputMint, amount, decimals) => {
    try {
      setIsLoadingQuote(true);
      
      const lamports = Math.floor(amount * Math.pow(10, decimals));
      const slippageBps = Math.floor(settings.slippage * 100);
      
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${lamports}&slippageBps=${slippageBps}`
      );
      
      const data = await response.json();
      setQuoteData(data);
      
      if (data.outAmount) {
        const outDecimals = tokens[buyToken].decimals;
        const outAmount = data.outAmount / Math.pow(10, outDecimals);
        setBuyAmount(outAmount.toFixed(6));
      }
      
      setIsLoadingQuote(false);
      return data;
    } catch (err) {
      console.error('Error getting quote:', err);
      setIsLoadingQuote(false);
      return null;
    }
  }, [settings.slippage, tokens, buyToken]);

  const executeSwap = async () => {
    if (!wallet || !quoteData) return;

    try {
      setIsSwapping(true);
      const provider = getProvider();

      const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: wallet,
          wrapAndUnwrapSol: true,
        })
      });

      const { swapTransaction } = await response.json();

      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      const signedTransaction = await provider.signTransaction(transaction);
      const rawTransaction = signedTransaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });

      await connection.confirmTransaction(txid, 'confirmed');
      
      setTxSignature(txid);
      
      if (settings.soundEffects) {
        console.log('Swap success sound');
      }
      
      await fetchBalances(wallet);
      setSellAmount('');
      setBuyAmount('');
      setQuoteData(null);
      
      setIsSwapping(false);
    } catch (err) {
      console.error('Error executing swap:', err);
      alert('Swap failed: ' + err.message);
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (sellAmount && !isNaN(sellAmount) && parseFloat(sellAmount) > 0) {
        const inputMint = tokens[sellToken].address;
        const outputMint = tokens[buyToken].address;
        const decimals = tokens[sellToken].decimals;
        getQuote(inputMint, outputMint, parseFloat(sellAmount), decimals);
      } else {
        setBuyAmount('');
        setQuoteData(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [sellAmount, sellToken, buyToken, getQuote, tokens]);

  const handleSwapTokens = () => {
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    setSellAmount(buyAmount);
  };

  const handleMaxClick = () => {
    if (wallet && balances[sellToken]) {
      setSellAmount(balances[sellToken].toString());
    }
  };

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1500);
    fetchTokenPrices();
    
    if (settings.autoRefresh) {
      const priceInterval = setInterval(fetchTokenPrices, 60000);
      return () => clearInterval(priceInterval);
    }
  }, [settings.autoRefresh]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.token-selector')) {
        setShowSellDropdown(false);
        setShowBuyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (wallet && settings.autoRefresh) {
      const interval = setInterval(() => {
        fetchBalances(wallet);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [wallet, settings.autoRefresh, fetchBalances]);

  const sellUsdValue = sellAmount && tokenPrices[sellToken]?.price 
    ? (parseFloat(sellAmount) * tokenPrices[sellToken].price).toFixed(2)
    : '0.00';

  const buyUsdValue = buyAmount && tokenPrices[buyToken]?.price 
    ? (parseFloat(buyAmount) * tokenPrices[buyToken].price).toFixed(2)
    : '0.00';

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">
          <div className="loading-cube" />
        </div>
        <div className="loading-text">INITIALIZING SWAP</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="bg-effect-left" />
      <div className="bg-effect-right" />

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>SETTINGS</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="settings-content">
              {/* Slippage Tolerance */}
              <div className="setting-section">
                <div className="setting-label">
                  <Zap size={20} />
                  <span>Slippage Tolerance</span>
                </div>
                <div className="setting-description">
                  Maximum price difference you're willing to accept
                </div>
                <div className="slippage-options">
                  <button 
                    className={settings.slippage === 0.1 ? 'active' : ''}
                    onClick={() => handleSlippageChange(0.1)}
                  >
                    0.1%
                  </button>
                  <button 
                    className={settings.slippage === 0.5 ? 'active' : ''}
                    onClick={() => handleSlippageChange(0.5)}
                  >
                    0.5%
                  </button>
                  <button 
                    className={settings.slippage === 1.0 ? 'active' : ''}
                    onClick={() => handleSlippageChange(1.0)}
                  >
                    1.0%
                  </button>
                  <div className="custom-slippage">
                    <input
                      type="number"
                      value={settings.slippage}
                      onChange={(e) => handleSlippageChange(e.target.value)}
                      min="0.1"
                      max="50"
                      step="0.1"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              {/* Transaction Deadline */}
              <div className="setting-section">
                <div className="setting-label">
                  <Clock size={20} />
                  <span>Transaction Deadline</span>
                </div>
                <div className="setting-description">
                  Your transaction will revert if pending for more than this time
                </div>
                <div className="deadline-input">
                  <input
                    type="number"
                    value={settings.deadline}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                    min="1"
                    max="60"
                  />
                  <span>minutes</span>
                </div>
              </div>

              {/* RPC Endpoint */}
              <div className="setting-section">
                <div className="setting-label">
                  <Server size={20} />
                  <span>RPC Endpoint</span>
                </div>
                <div className="setting-description">
                  Choose your Solana RPC provider
                </div>
                <div className="rpc-options">
                  {Object.entries(rpcEndpoints).map(([key, endpoint]) => (
                    <button
                      key={key}
                      className={settings.rpcEndpoint === key ? 'active' : ''}
                      onClick={() => handleSettingsChange('rpcEndpoint', key)}
                    >
                      <div className="rpc-name">{endpoint.name}</div>
                      <div className="rpc-speed">{endpoint.speed}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Settings */}
              <div className="setting-section">
                <div className="setting-toggle">
                  <div className="toggle-info">
                    <div className="setting-label">
                      <RotateCw size={20} />
                      <span>Auto-Refresh</span>
                    </div>
                    <div className="setting-description">
                      Automatically refresh prices and balances
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoRefresh}
                      onChange={(e) => handleSettingsChange('autoRefresh', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-section">
                <div className="setting-toggle">
                  <div className="toggle-info">
                    <div className="setting-label">
                      {settings.soundEffects ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      <span>Sound Effects</span>
                    </div>
                    <div className="setting-description">
                      Play sounds for transactions and notifications
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.soundEffects}
                      onChange={(e) => handleSettingsChange('soundEffects', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Reset Button */}
              <div className="settings-footer">
                <button className="reset-btn" onClick={resetSettings}>
                  Reset to Defaults
                </button>
                <button className="save-btn" onClick={() => setShowSettings(false)}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-logo">
          <img src="/logo.png" alt="Claude Swap Logo" className="logo-image" />
          <h1 className="logo-text">CLAUDE SWAP</h1>
        </div>
        
        <div className="header-actions">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            <Settings size={16} />
            <span>SETTINGS</span>
          </button>
          
          <button 
            onClick={wallet ? disconnectWallet : connectWallet}
            className={`wallet-btn ${wallet ? 'connected' : ''}`}
          >
            <Wallet size={16} />
            {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'CONNECT WALLET'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="info-banner">
          <Info size={18} />
          <span>Powered by Jupiter • Slippage: {settings.slippage}% • Best rates guaranteed</span>
        </div>

        <div className={`swap-card ${showSellDropdown ? 'dropdown-active' : ''}`}>
          <div className="card-header">
            <span className="card-label">YOU SELL</span>
            {wallet && (
              <button onClick={handleMaxClick} className="max-btn">
                MAX
              </button>
            )}
          </div>
          
          <div className="card-input-row">
            <input
              type="text"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0.0"
              className="amount-input"
            />
            
            <div className={`token-selector ${showSellDropdown ? 'active' : ''}`}>
              <button
                onClick={() => setShowSellDropdown(!showSellDropdown)}
                className="token-btn"
              >
                <span className="token-icon">{tokens[sellToken].icon}</span>
                <span>{sellToken}</span>
                <ChevronDown size={16} />
              </button>

              {showSellDropdown && (
                <div className="token-dropdown">
                  {Object.entries(tokens).map(([symbol, token]) => (
                    <button
                      key={symbol}
                      onClick={() => {
                        setSellToken(symbol);
                        setShowSellDropdown(false);
                      }}
                      disabled={symbol === buyToken}
                      className={`token-option ${symbol === sellToken ? 'active' : ''} ${symbol === buyToken ? 'disabled' : ''}`}
                    >
                      <span className="token-icon">{token.icon}</span>
                      <div className="token-info">
                        <div className="token-symbol">{symbol}</div>
                        <div className="token-name">{token.name}</div>
                      </div>
                      {wallet && (
                        <div className="token-balance">
                          {balances[symbol]?.toFixed(4) || '0.0000'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card-usd-value">
            ≈ ${sellUsdValue} USD
          </div>

          {wallet && (
            <div className="card-balance">
              <span>Balance: {balances[sellToken]?.toFixed(4) || '0.0000'} {sellToken}</span>
              <span>${((balances[sellToken] || 0) * (tokenPrices[sellToken]?.price || 0)).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="swap-button-container">
          <button onClick={handleSwapTokens} className="swap-icon-btn">
            <ArrowDownUp size={20} />
          </button>
        </div>

        <div className={`swap-card ${showBuyDropdown ? 'dropdown-active' : ''}`}>
          <div className="card-header">
            <span className="card-label">YOU BUY</span>
          </div>
          
          <div className="card-input-row">
            <input
              type="text"
              value={isLoadingQuote ? 'Loading...' : buyAmount}
              readOnly
              placeholder="0.0"
              className="amount-input"
            />
            
            <div className={`token-selector ${showBuyDropdown ? 'active' : ''}`}>
              <button
                onClick={() => setShowBuyDropdown(!showBuyDropdown)}
                className="token-btn"
              >
                <span className="token-icon">{tokens[buyToken].icon}</span>
                <span>{buyToken}</span>
                <ChevronDown size={16} />
              </button>

              {showBuyDropdown && (
                <div className="token-dropdown">
                  {Object.entries(tokens).map(([symbol, token]) => (
                    <button
                      key={symbol}
                      onClick={() => {
                        setBuyToken(symbol);
                        setShowBuyDropdown(false);
                      }}
                      disabled={symbol === sellToken}
                      className={`token-option ${symbol === buyToken ? 'active' : ''} ${symbol === sellToken ? 'disabled' : ''}`}
                    >
                      <span className="token-icon">{token.icon}</span>
                      <div className="token-info">
                        <div className="token-symbol">{symbol}</div>
                        <div className="token-name">{token.name}</div>
                      </div>
                      {wallet && (
                        <div className="token-balance">
                          {balances[symbol]?.toFixed(4) || '0.0000'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card-usd-value">
            ≈ ${buyUsdValue} USD
          </div>

          {wallet && (
            <div className="card-balance">
              <span>Balance: {balances[buyToken]?.toFixed(4) || '0.0000'} {buyToken}</span>
              <span>${((balances[buyToken] || 0) * (tokenPrices[buyToken]?.price || 0)).toFixed(2)}</span>
            </div>
          )}
        </div>

        {quoteData && buyAmount && sellAmount && (
          <div className="exchange-rate">
            <span className="rate-label">Exchange Rate</span>
            <span className="rate-value">
              1 {sellToken} ≈ {(parseFloat(buyAmount) / parseFloat(sellAmount)).toFixed(6)} {buyToken}
            </span>
          </div>
        )}

        <button
          disabled={!wallet || !sellAmount || parseFloat(sellAmount) === 0 || !quoteData || isSwapping}
          onClick={executeSwap}
          className={`execute-swap-btn ${(!wallet || !sellAmount || parseFloat(sellAmount) === 0 || !quoteData || isSwapping) ? 'disabled' : ''}`}
        >
          {isSwapping ? 'SWAPPING...' :
           !wallet ? 'CONNECT WALLET TO SWAP' : 
           !sellAmount || parseFloat(sellAmount) === 0 ? 'ENTER AMOUNT' : 
           'EXECUTE SWAP'}
        </button>

        {txSignature && (
          <div className="tx-success">
            <a 
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View Transaction on Solscan <ExternalLink size={14} />
            </a>
          </div>
        )}

        {quoteData && (
          <div className="transaction-details">
            <div className="detail-row">
              <span>Price Impact</span>
              <span className="detail-value impact">
                {quoteData.priceImpactPct ? `${(quoteData.priceImpactPct * 100).toFixed(3)}%` : '< 0.01%'}
              </span>
            </div>
            <div className="detail-row">
              <span>Network Fee</span>
              <span className="detail-value">~$0.001</span>
            </div>
            <div className="detail-row">
              <span>Route</span>
              <span className="detail-value">Jupiter Aggregator</span>
            </div>
            <div className="detail-row">
              <span>Slippage Tolerance</span>
              <span className="detail-value">{settings.slippage}%</span>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <div>© 2026 CLAUDE SWAP • Powered by Jupiter & Solana</div>
        <div className="footer-links">
          <a href="https://jup.ag" target="_blank" rel="noopener noreferrer">Jupiter</a>
          <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Phantom</a>
          <a href="https://solscan.io" target="_blank" rel="noopener noreferrer">Solscan</a>
          <a href="https://solana.com" target="_blank" rel="noopener noreferrer">Solana</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
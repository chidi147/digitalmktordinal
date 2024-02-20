import React, { useEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { PandaSigner, bsv, fromByteString, toByteString, ScryptProvider, UTXO, PubKey, findSig, MethodCallOptions, Addr } from 'scrypt-ts';
import { connected } from 'process';
import { Console, error } from 'console';
import {OneSatApis, OrdiMethodCallOptions, OrdiNFTP2PKH, OrdiProvider } from 'scrypt-ord';
import { DigitalMktOrdinalNFT } from './contracts/digitalmktordinal';
import { Box, Button, Tab, Tabs } from '@mui/material';
import ItemViewWallet from './ItemViewWallet';
import { get } from 'http';
import ItemViewMarket from './ItemViewMarket';


//const App: React.FC = () =>

function App() {
  const signerRef = useRef<PandaSigner>()

  const [Isconnected, setIsconnected] = useState(false)

 
  const [walletItems, setWalletItems] = useState([]) 
  const [marketItems, setMarketItems] = useState([])

  const [connectedOrdinalAddress, setConnectedOrdinalAddress] = useState(undefined)

  const [activeTab, setActiveTab] = useState(0)

  useEffect( ()=> {
    loadMarketItems()
    loadWalletItems()
  }, []);

  async function loadMarketItems() {
    const marketItemsRaw = localStorage.getItem('marketItems')
    if(marketItemsRaw) {
      const marketItems = JSON.parse(marketItemsRaw)
      setMarketItems(marketItems)
    }
  }

  function storeMarketItem(digitalmktordlockTx: bsv.Transaction, price: number, seller: string, item: any){
    let marketItems: any = localStorage.getItem('marketItems')
    if (!marketItems){
      marketItems = {}
    }else{
      marketItems = JSON.parse(marketItems)
    }

    marketItems[item.origin.outpoint] = {
      txid: digitalmktordlockTx.id,
      Vout: 0,
      price: price,
      item: item
    }

    localStorage.setItem('marketItems', JSON.stringify(marketItems))
    setMarketItems(marketItems)
  }

  function removeMarketItem(originOutpoint:string) {
    let marketItems: any = localStorage.getItem('marketItems')

    if (!marketItems) {
      marketItems = {}
    } else {
      marketItems = JSON.parse(marketItems)
    }

    delete marketItems[originOutpoint] 

    localStorage.setItem('marketItems', JSON.stringify(marketItems))
    setMarketItems(marketItems)

  }

  async function loadWalletItems() {
   const signer = signerRef.current as PandaSigner; //const signer = new PandaSigner(new OrdiProvider);

    if (signer) { 
      try { 
        const connectedOrdinalAddress = await signer.getOrdAddress()

        const url = `https://testnet.ordinals.gorillapool.io/api/txos/address/${connectedOrdinalAddress.toString()}/unspent?bsv20=false`;
        const response = await fetch(url)
        const data = await response.json()

        const filteredData = data.filter(e => marketItems[e.origin.outpoint] == undefined);

        setWalletItems(filteredData);
      } catch (error) {
        console.error('Error fetching wallet Items:', error);
      }
    }
  }

  const handleConnect = async () => {
    const provider = new ScryptProvider//new OrdiProvider(bsv.Networks.testnet)
    const signer = new PandaSigner(provider)

    signerRef.current = signer
    const {isAuthenticated, error} = await signer.requestAuth()
    if(!isAuthenticated) {
      throw new Error(error)
    }

    const ordiAddr:any = await signer.getOrdAddress()

    setConnectedOrdinalAddress(ordiAddr)
    setIsconnected(true)
    loadWalletItems()
  }

  const handleTabChange = (e, tabIndex) => {
    if (tabIndex == 0) {
      loadWalletItems()
    } else if (tabIndex == 1) {
      loadMarketItems()
    }
    setActiveTab(tabIndex)
  }

  const handleList = async (idx: number, priceSats: number) => {
    const signer = signerRef.current as PandaSigner;//const signer = new PandaSigner(new OrdiProvider)
   
    const item = walletItems[idx]
    const outpoint = item.outpoint
    

    // Create a P2PKH object from a UTXO. 
    const Network = bsv.Networks.testnet//here network is set manually instead of @110
    //OneSatApis.setNetwork(bsv.Networks.testnet)
    const utxo: UTXO = await OneSatApis.fetchUTXOByOutpoint(outpoint,Network)
    const p2pkh = OrdiNFTP2PKH.fromUTXO(utxo)

    // Construct recipient smart contract - the digitalmktordlock.
    const ordPublicKey = await signer.getOrdPubKey()
    const seller = PubKey(ordPublicKey.toByteString())
    const price = BigInt(priceSats)

    const digitalmktordlock = new DigitalMktOrdinalNFT(seller, price)
    await digitalmktordlock.connect(signer)

    // Unlock deployed NFT and send it to the recipient ordinal lock contract.
    await p2pkh.connect(signer)
    
    const { tx: transferTx } = await p2pkh.methods.unlock(
      (sigResps) => findSig(sigResps, ordPublicKey),
      seller,
      {
        transfer: digitalmktordlock,
        pubKeyOrAddrToSign: ordPublicKey,
      } as OrdiMethodCallOptions<OrdiNFTP2PKH>
    )


    console.log("Transfered NFT:", transferTx.id)
    // Store reference in local storage.
    storeMarketItem(transferTx, priceSats, seller, item)
  }


  const handleBuy = async (marketItem: any) => {
    const signer = signerRef.current as PandaSigner
    await signer.connect()

    const tx = await signer.provider.getTransaction(marketItem.txid)
    const instance = DigitalMktOrdinalNFT.fromTx(tx, 0)
    await instance.connect(signer)

    
    const buyerPublicKey = await signer.getOrdPubKey()
    const destAddr = Addr(buyerPublicKey.toAddress().toByteString())

    const callRes = await instance.methods.purchase(
      destAddr
    )
    
    console.log("Purchase call:", callRes.tx.id)

    removeMarketItem(marketItem.item.origin.outpoint)
  }

 

  const handleCancel = async (marketItem: any) => {
    const signer = signerRef.current as PandaSigner
    await signer.connect()

    const tx = await signer.provider.getTransaction(marketItem.txid)
    const instance = DigitalMktOrdinalNFT.fromTx(tx, 0)
    await instance.connect(signer)

    const sellerPublicKey = await signer.getOrdPubKey()

    const callRes = await instance.methods.cancel(
      (sigResps) => findSig(sigResps, sellerPublicKey),
      {

        pubKeyOrAddrToSign: sellerPublicKey
      } as MethodCallOptions<DigitalMktOrdinalNFT>

    )
      console.log("cancel call:", callRes.tx.id)

      removeMarketItem(marketItem.item.origin.outpoint)
  }

  return (
   <div className="App">
     {Isconnected ? (
        <div>
          <Box>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="MY NFT LISTS"/>
              <Tab label="Digital Market Place."/>
            </Tabs>
          </Box>
          {activeTab === 0 && (
            <Box sx={{display: 'flex', flexWrap:'wrap', justifyContent:'center' }}>
              {walletItems.map((item, idx) => {
               return <ItemViewWallet key={idx} item={item} idx={idx} onList={handleList} />
              })}
            </Box>
          )}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.entries(marketItems).map(([key, val], idx) => {
                const isMyListing = val.item.owner == connectedOrdinalAddress.toString()
                return <ItemViewMarket key={idx} marketItem={val} idx={idx} isMyListing={isMyListing} onBuy={handleBuy} onCancel={handleCancel} />
              })}
            </Box>
          )}
        </div>
       ):(
        <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
         <Button variant='contained' size='large' onClick={handleConnect}>
            connet panda wallet
         </Button>
        </div>
      )}
    </div>
  );
};

export default App;

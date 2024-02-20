import { Button, Card, CardContent, TextField, Typography } from "@mui/material"
import { Console, error } from "console"
import { useEffect, useState } from "react"

interface ItemProps{
    item: any
    idx: number
    onList: (idx:number, priceSats:number) => void
}
const ItemViewWallet: React.FC<ItemProps> = (
  {
    item, idx, onList
  }
) => {

    const [textData, setTextData] = useState<string | null>(null)
    const [isListing, setIsListing] = useState<boolean>(false)

    const [price, setPrice] = useState<string>('')
    
    useEffect( ()=> {
        if (item.origin.data.insc.file.type === 'text/plain') {
            const url = `https://testnet.ordinals.gorillapool.io/content/${item.origin.outpoint}`
            fetch(url).then(response => response.text()).then(data => setTextData(data))
            .catch(error => console.error(error))
        }

    }, [item]);

    const handleListForSale = async ()=> {
        if(isListing) {
            const priceFloat = parseFloat(price)
            if(! isNaN(priceFloat) && priceFloat >= 0.00000001) {
                const priceSats = Math.floor(priceFloat * 10**8)
                onList(idx, priceSats)
                setIsListing(false)
                setPrice('')
            } else {
                console.error('invalid price entered')
            }
        } else {
            setIsListing(true)
        }
    }

    return(
        <Card style={{width:300, height:350, margin:2}}>
            <CardContent>
                {
                 item.origin.data.insc.file.type.startsWith('image/') && (
                  <img style={{maxWidth:150, height:100}} src={`https://testnet.ordinals.gorillapool.io/content/${item.origin.outpoint}`} alt={`Content #${item.origin.num}`}/>
                )}
                {
                item.origin.data.insc.file.type ==='text/plain' && (
                    <Typography variant="h6" component="div">
                        {textData || 'loading text...'}
                    </Typography> 
                )}
                {item.origin.num ? (
                 <Typography variant="body2" color="text.secondary">
                    #{item.origin.num}
                 </Typography>
             ) : (
                 <Typography variant="body2" color="text.secondary">
                      pending ...
                 </Typography>
                )}
                <Button variant="contained" onClick={handleListForSale}>
                    {isListing ? 'confirm': 'List For Sale'}
                </Button>
                {isListing && (
                    <TextField
                     label="Set Price (BSV)"
                         variant="outlined"
                         value={price}
                         onChange={(e)=>setPrice(e.target.value)}
                        type="number"
                        inputProps={{step: "0.01"}}//allow decimal values
                        style={{marginTop: 10}}
                    />
                )}
            
            </CardContent>
        </Card>
    );
};

export default ItemViewWallet;
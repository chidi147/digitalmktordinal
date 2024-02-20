import { Button, Card, CardContent, TextField, Typography } from "@mui/material"
import { Console, error } from "console"
import { useEffect, useState } from "react"

interface ItemProps {
    marketItem: any
    idx: number
    isMyListing: boolean
    onBuy: (marketItem:any) => void
    onCancel: (marketItem: any) => void
}
const ItemViewMarket: React.FC<ItemProps> = (
    {
        marketItem, idx, isMyListing, onBuy, onCancel
    }
) => {
    const [textData, setTextData] = useState<string | null>(null)
    
    useEffect(() => {
        if (marketItem.item.origin.data.insc.file.type === 'text/plain') {
            const url = `https://testnet.ordinals.gorillapool.io/content/${marketItem.item.origin.outpoint}`
            fetch(url).then(response => response.text()).then(data => setTextData(data))
                .catch(error => console.error(error))
        }

    }, [marketItem]);

    

    return (
        <Card style={{ width: 300, height: 350, margin: 2 }}>
            <CardContent>
                {
                    marketItem.item.origin.data.insc.file.type.startsWith('image/') && (
                        <img style={{ maxWidth: 150 }} src={`https://testnet.ordinals.gorillapool.io/content/${marketItem.item.origin.outpoint}`} alt={`Content #${marketItem.item.origin.num}`} />
                    )}
                {
                    marketItem.item.origin.data.insc.file.type === 'text/plain' && (
                        <Typography variant="h5" component="div">
                            {textData || 'loading text...'}
                        </Typography>
                    )}
                {marketItem.item.origin.num ? (
                    <Typography variant="body2" color="text.secondary">
                        #{marketItem.item.origin.num}
                    </Typography>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        pending ...
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                    <b>price</b>: {marketItem.price/(10**8)} BSV
                </Typography>
                {isMyListing ? (
                    <Button variant="contained" onClick={() => onCancel(marketItem)}>Cancel</Button>
                ) : (
                    <Button variant="contained" onClick={() => onBuy(marketItem)}>Buy</Button>
                )}

            </CardContent>
        </Card>
    );
};

export default ItemViewMarket;
# CryptoCanvas.art Ethereum contract
[![Build Status](https://travis-ci.com/TheMindhouse/cryptocanvas-solidity.svg?branch=master)](https://travis-ci.com/TheMindhouse/cryptocanvas-solidity)

CryptoCanvas are distributed and collectible community artworks build on Ethereum blockchain. Visit [CryptoCanvas.art][homepage] if you want to become the blockchain picasso, buy crypto art created by the community, or just enjoy what have been already painted. 

This repository hosts solidity code of Ethereum contract and information about it. 

## Using the contract on your local machine

To start using a contract on your local machine you need [truffle](https://github.com/trufflesuite/truffle) and [ganache](https://github.com/trufflesuite/ganache-cli). If you have it installed and running on port _8545_ just use a command: 

`truffle migrate --network dev --reset `

It will put all contracts to a local test environment. 

## Code organization

The code is split into few contracts: 
* `CanvasFactory` - handles creating and drawing on a canvas. Canvas struct is defined over here. 
* `CanvasState` - manages canvases' state. 
* `RewardableCanvas` - handles fees: commissions and rewards. 
* `BiddableCanvas` - handles initial bidding phase: after a canvas is finished until it's bought by the first user. 
* `CanvasMarket` - handles trading canvases.
* `CryptoArt` - the main contract that is put on the main network. Has some util methods. 
* `TimeAware`, `TestableArt` - contracts created for tests. Thanks to them, it's possible to manipulate time in truffle tests.
* `Withdrawable` - handles withdrawals. 

## Interacting with the contract

CryptoCanvas contract is normal Ethereum thus you need to be aware of gas costs. There are two types of interaction with the contract: calls and transactions. Calls are free, transactions require you to pay gas costs. Precise cost may vary depending on the current contract state. You can find detailed cost in the newest build details on [Travis CI](https://travis-ci.com/TheMindhouse/cryptocanvas-solidity). 

This docs skip non public methods or methods dedicated only for the owner of the contract. 

### CanvasFactory 

* `createCanvas() returns (uint canvasId)` - creates a new canvas. Fails if there are too many canvases. 
* `setPixel(uint32 _canvasId, uint32 _index, uint8 _color)` - sets a single pixel. 
* `setPixels(uint32 _canvasId, uint32[] _indexes, uint8[] _colors)` - sets many pixels at once. Be careful - sending a lot of pixels may cause out of gas error. Depending on a gas limit it should be safe to send 100-150 pixels. 
* `getCanvasBitmap(uint32 _canvasId) view returns (uint8[])` - returns canvas' bitmap. 
* `getCanvasPaintedPixelsCount(uint32 _canvasId) view returns (uint32)` - returns how many pixles has been already set. 
* `getPixelCount() external pure returns (uint)` - returns number of pixels in a canvas. 
* `getCanvasCount() view returns (uint)` - returns number of created canvases. 
* `isCanvasFinished(uint32 _canvasId) view returns (bool)` - returns true if cavnas has been finished, false otherwise. 
* `getPixelAuthor(uint32 _canvasId, uint32 _pixelIndex) view returns (address)` - returns an address of the pixel's author. 
* `getPaintedPixelsCountByAddress(address _address, uint32 _canvasId) view returns (uint32)` - returns number of pixels set by given address.

### CanvasState

* `getCanvasState(uint32 _canvasId) view returns (uint8)` - returns 0 if canvas is still being painted, 1 if in initial bidding phase, 2 if already sold. 
* `getCanvasByState(uint8 _state) view returns (uint32[])` - returns ids of canvases in the given state. 
* `setCanvasName(uint32 _canvasId, string _name)` - sets a canvas' name. Can be called only by the canvas' owner. Max 24 characters. 

### RewardableCanvas

* `addRewardToPendingWithdrawals(uint32 _canvasId)` - adds all remaining rewards of the caller to his pending withdrawals. 
* `calculateRewardToWithdraw(uint32 _canvasId, address _address) view returns (uint, uint)` - Calculates unpaid rewards of a given address. Returns amount to withdraw and amount of pixels owned.
* `getTotalCommission(uint32 _canvasId) view returns (uint)` - Returns total amount of commission charged for a given canvas.
* `getCommissionWithdrawn(uint32 _canvasId) view returns (uint)` - Returns total amount of commission that has been already paid (added to pending withdrawals).
* `getTotalRewards(uint32 _canvasId) view returns (uint)` - returns all rewards charged for the given canvas.
* `getRewardsWithdrawn(uint32 _canvasId, address _address) view returns (uint)` - Returns total amount of rewards that has been already paid (added to pending withdrawals) by a given address.
* `splitBid(uint _amount) pure returns (uint, uint)` - Calculates how the initial bidding money will be split. Returns commission and sum of all painters' rewards.
* `splitTrade(uint _amount) pure returns (uint, uint, uint)` - Calculates how the money from selling canvas will be split. Returns commission, sum of painters' rewards and a seller's profit.

### BiddableCanvas

* `makeBid(uint32 _canvasId) payable` - makes a bid for specified canvas. Amount of eth send has to greater than previous bid. Specified canvas has to be in initial bidding phase. 
* `getLastBidForCanvas(uint32 _canvasId) view returns (uint32, address, uint, uint)` - Returns last bid for canvas. If the initial bidding has been already finished that will be winning offer. Returns canvasId, bidder address, amount of Wei, finish time. 
* `balanceOf(address _owner) view returns (uint)` - Returns number of canvases owned by the given address.

### CanvasMarket

* `acceptSellOffer(uint32 _canvasId) payable` - Buys artwork. The artwork has to be put on sale. If the caller has bid before for that artwork, that bid will be canceled.
* `offerCanvasForSale(uint32 _canvasId, uint _minPrice)` - Offers canvas for sale for a minimal price. Anybody can buy it for an amount greater or equal to min price.
* `offerCanvasForSaleToAddress(uint32 _canvasId, uint _minPrice, address _receiver)` - Offer canvas for sale to a given address. Only that address is allowed to buy canvas for an amount greater or equal to minimal price.
* `cancelSellOffer(uint32 _canvasId)` - Cancels previously made sell offer. The caller has to be an owner of the canvas. The function will fail if there is no sell offer or the canvas.
* `makeBuyOffer(uint32 _canvasId) payable` - Places buy offer for the canvas. It cannot be called by the owner of the canvas. A new offer has to be bigger than the existing offer. Returns ethers to the previous bidder, if any.
* `cancelBuyOffer(uint32 _canvasId)` - Cancels previously made buy offer. The caller has to be an author of the offer.
* `acceptBuyOffer(uint32 _canvasId, uint _minPrice)` - Accepts buy offer for the canvas. The caller has to be the owner of the canvas. You can specify a minimal price, which is the protection against accidental calls.
* `getCurrentBuyOffer(uint32 _canvasId) view returns (bool, address, uint)` - Returns current buy offer for the canvas: whether has an offer, buyer's address and an offer's amount. 
* `getCurrentSellOffer(uint32 _canvasId) view returns (bool, address, uint, address)` - Returns current sell offer for the canvas: whether is for sale, seller's address, a minimum amount of Wei and an address of a specified buyer.

### CryptoArt

* `getCanvasInfo(uint32 _canvasId) external view returns (uint32, string,uint32, uint8, uint, address,address)` - returns extra information about the canvas: id, name, painted pixels, canvas state, initial bidding finish time, owner's address and address that painting is booked for. 
* `getCanvasByOwner(address _owner) view returns (uint32[])` - returns ids of canvases that belong to given owner. 
* `getCanvasesWithSellOffer(bool includePrivateOffers) view returns (uint32[])` - Returns array of canvas's ids. Returned canvases have sell offer. If includePrivateOffers is true, includes offers that are targeted only to one specified address.
* `getCanvasPainters(uint32 _canvasId) view returns (address[])` - Returns array of all the owners of all of pixels. If some pixel hasn't been painted yet, 0x0 address will be returned.

## Color palette
CryptoCanvas, due to technical and aesthetic reasons, uses a custom color palette. Each number corresponds to a fixed color. Here is the full-color palette. 

Color `0` represents lack of color. You can think of it as a fully transparent pixel. It's not allowed to set pixel's color as `0`.

![Full color palette](colour-palette.jpeg "Full color palette")

### Javascript palette array 
Here is full palette represented by Javascript array. For example color `1` is `#FFFF9E`.

```Javascript
var hexPalette = ['#FFFFFF', '#FFFF9E', '#FFE6A3', '#FFD9CE', '#FFC7DF', '#FFB4EF', '#EFB3FF', '#CCD3FF', '#D4D0FF', '#B6ECFF', '#BCF8FF', '#C1FEC9', '#A9FF8C', '#EFFFA0', '#FFF3B7', '#FFD98B', '#F4F4F4', '#FEFF7D', '#FFE48C', '#FFCEC1', '#FFC4CE', '#FFAAEE', '#ECA5FF', '#BECBFF', '#C4C0FF', '#A9E3FF', '#9FF5FF', '#B5FCBE', '#99FF78', '#E3FE5F', '#FFF39F', '#FFCE6F', '#EAEAEA', '#FFFA51', '#FFD479', '#FFBFAF', '#FFB5BC', '#FF9FEB', '#E996FF', '#ACBEFF', '#BCB7FF', '#91D5FF', '#7FF2FF', '#A0FAAC', '#80FF58', '#D6F151', '#FEEE8B', '#FFC854', '#E1E1E1', '#FFF51B', '#FFC45A', '#FFAF99', '#FFA6AB', '#FF96E9', '#E689FF', '#9BB2FF', '#B3AEFF', '#75DCFF', '#68F0FF', '#7BF68E', '#76F94E', '#C8E32A', '#FFE261', '#FFBF49', '#D7D7D7', '#FFE615', '#FFBD30', '#FF9F85', '#FF979B', '#FF84E6', '#E27BFF', '#94A8FF', '#A8A2FF', '#67D5FF', '#40EDFF', '#5BF177', '#6BEF42', '#BDD831', '#FAD846', '#FFB446', '#D0D0D0', '#FFD80F', '#FFB618', '#FF9274', '#FF878B', '#FF73DF', '#DB6DFF', '#8D9FFF', '#9E96FF', '#55CDFF', '#00EAFF', '#50E86D', '#62E738', '#B3CE22', '#F3CD20', '#FFAA43', '#C5C5C5', '#FFCF00', '#FFAA00', '#FF8260', '#FF7479', '#FF66D3', '#D264F9', '#7D8FFF', '#938AFF', '#40CCFF', '#00E5FF', '#43DE63', '#4AD317', '#A6C100', '#ECC60F', '#F99C38', '#B8B8B8', '#FFC300', '#FF9200', '#FF6E47', '#FF6456', '#F55BC8', '#CA5BF1', '#6E81FF', '#8B82FF', '#24B8FF', '#00E0FF', '#00D138', '#2DBE00', '#99B400', '#E4BE00', '#ED8F2D', '#A4A4A4', '#FFA700', '#FF8500', '#FF633C', '#FF523A', '#E74DBA', '#BF50E6', '#6372FF', '#7C74F1', '#20A9F2', '#00D3FA', '#00BD3B', '#19B300', '#86A000', '#D6AF00', '#DB8122', '#8E8E8E', '#FF8A00', '#FF7900', '#F8572F', '#FF3E21', '#DA3FAD', '#B344DA', '#5964FF', '#6E66E3', '#1F9CDF', '#00BFE2', '#00A71A', '#00A800', '#748E00', '#C7A000', '#CA7315', '#757575', '#F37400', '#F36000', '#E34113', '#FF1C00', '#C92C9D', '#A93AD0', '#4E56F5', '#625AD6', '#0087D5', '#00AECE', '#009500', '#009B00', '#678000', '#B08A00', '#C15F0A', '#686868', '#D06200', '#D74700', '#CE2412', '#F20000', '#B9008C', '#9F2FC6', '#4448E7', '#5950CC', '#0071CD', '#009BC3', '#008300', '#008F00', '#5B7200', '#947500', '#B74A02', '#4E4E4E', '#A44B00', '#C12D0C', '#BE1D00', '#D90000', '#A20077', '#850FAD', '#2439DD', '#483FBB', '#005CB2', '#00869F', '#007800', '#007A00', '#465700', '#6F5700', '#973400', '#343434', '#7E3300', '#AC0E12', '#A41F00', '#B60000', '#8B0061', '#6E0096', '#012AD3', '#372EA9', '#094897', '#007086', '#006D00', '#006800', '#405300', '#564500', '#791D00', '#252525', '#5A2600', '#7B1306', '#841B00', '#7B1500', '#6F004D', '#65008D', '#0122AC', '#231794', '#15387A', '#005E70', '#005600', '#005500', '#354500', '#4F3F00', '#5F1A00', '#000000', '#461E00', '#4A1600', '#641903', '#501200', '#500038', '#4F0070', '#011B86', '#0F007E', '#1B295D', '#004C5A', '#004A00', '#004100', '#2A3600', '#483A00', '#451700'];

```

[homepage]: https://www.cryptocanvas.art

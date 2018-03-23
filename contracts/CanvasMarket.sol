pragma solidity 0.4.21;

import "./BiddableCanvas.sol";

/**
* @dev  This contract takes trading our artworks. Trading can happen
*       if artwork has been initially bought. 
*/
contract CanvasMarket is BiddableCanvas {

    mapping(uint32 => SellOffer) artworksForSale;
    mapping(uint32 => BuyOffer) buyOffers;
    uint public fees;

    event ArtworkOfferedForSale(uint32 canvasId, uint minPrice, address toAddress);
    event ArtworkNoLongerForSale(uint32 _canvasId);
    event ArtworkSold(uint32 canvasId, uint amount, address from, address to);
    event FeeWithdrawn(uint amount);
    event BuyOfferMade(uint32 canvasId, address buyer, uint amount);
    event BuyOfferCancelled(uint32 canvasId, address buyer, uint amount);

    struct SellOffer {
        bool isForSale;
        address seller;
        uint minPrice;
        address onlySellTo;     // specify to sell only to a specific address
    }

    struct BuyOffer {
        bool hasOffer;
        address buyer;
        uint amount;
    }

    /**
    * @notice   Buy artwork. Artwork has to be put on sale. If buyer has bid before for 
    *           for that artwork bid will be canceled. 
    */
    function buyArtwork(uint32 _canvasId) external payable {
        Canvas storage canvas = _getCanvas(_canvasId);
        SellOffer storage sellOffer = artworksForSale[_canvasId];

        require(msg.sender != canvas.owner);
        //don't sell for the owner
        require(sellOffer.isForSale);
        require(msg.value >= sellOffer.minPrice);
        require(sellOffer.seller != canvas.owner);
        //seller is no longer owner
        require(sellOffer.onlySellTo == 0x0 || sellOffer.onlySellTo == msg.sender);
        //protect from selling to unintented address

        uint fee = msg.value / COMMISSION;
        uint toTransfer = msg.value - fee;

        sellOffer.seller.transfer(toTransfer);
        fees += fee;

        addressToCount[canvas.owner]--;
        addressToCount[msg.sender]++;

        canvas.owner = msg.sender;
        artworkNoLongerForSale(_canvasId);

        ArtworkSold(_canvasId, msg.value, sellOffer.seller, msg.sender);

        //If the buyer have placed buy offer, refound it 
        BuyOffer offer = buyOffers[_canvasId];
        if(offer.buyer == msg.sender) {
            buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
            if (offer.amount > 0) {
                //refund offer
                offer.buyer.transfer(offer.amount);
            }
        }

    }

    function offerArtworkForSale(uint32 _canvasId, uint _minPrice) external stateOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);

        artworksForSale[_canvasId] = SellOffer(true, msg.sender, _minPrice, 0x0);
        ArtworkOfferedForSale(_canvasId, _minPrice, 0x0);
    }

    function offerArtworkForSaleToAddress(uint32 _canvasId, uint _minPrice, address _receiver) external stateOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);

        artworksForSale[_canvasId] = SellOffer(true, msg.sender, _minPrice, _receiver);
        ArtworkOfferedForSale(_canvasId, _minPrice, _receiver);
    }

    function artworkNoLongerForSale(uint32 _canvasId) public stateOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);

        artworksForSale[_canvasId] = SellOffer(false, msg.sender, 0, 0x0);
        ArtworkNoLongerForSale(_canvasId);
    }

    function enterBuyOffer(uint32 _canvasId) external payable stateOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        BuyOffer existing = buyOffers[_canvasId];

        require(canvas.owner != msg.sender);
        require(canvas.owner != 0x0);
        require(msg.value > existing.amount);

        if (existing.amount > 0) {
            //refund previous buy offer. 
            existing.buyer.transfer(existing.amount);
        }

        buyOffers[_canvasId] = BuyOffer(true, msg.sender, msg.value);
        BuyOfferMade(_canvasId, msg.sender, msg.value);
    }

    function cancelBuyOffer(uint32 _canvasId) external stateOwned(_canvasId) {
        BuyOffer memory offer = buyOffers[_canvasId];
        require(offer.buyer == msg.sender);

        buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
        if (offer.amount > 0) {
            //refund offer
            offer.buyer.transfer(offer.amount);
        }

        BuyOfferCancelled(_canvasId, offer.buyer, offer.amount);
    }

    function acceptBuyOffer(uint32 _canvasId, uint _minPrice) external stateOwned(_canvasId) {
        Canvas canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);

        BuyOffer storage offer = buyOffers[_canvasId];
        require(offer.amount > 0);
        require(offer.buyer != 0x0);
        require(offer.amount > _minPrice);

        uint fee = offer.amount / COMMISSION;
        uint toTransfer = offer.amount - fee;

        addressToCount[canvas.owner]--;
        addressToCount[offer.buyer]++;

        canvas.owner = offer.buyer;
        fees += fee;
        msg.sender.transfer(toTransfer);

        buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
        artworksForSale[_canvasId] = SellOffer(false, 0x0, 0, 0x0);

        ArtworkSold(_canvasId, msg.value, msg.sender, offer.buyer);
    }

    function getCurrentBuyOffer(uint32 _canvasId) external view returns(bool hasOffer, address buyer, uint amount) {
        BuyOffer offer = buyOffers[_canvasId];
        return (offer.hasOffer, offer.buyer, offer.amount);
    }

    function getCurrentSellOffer(uint32 _canvasId) external view returns(bool isForSale, address seller, uint minPrice, address onlySellTo) {
        SellOffer offer = artworksForSale[_canvasId];
        return (offer.isForSale, offer.seller, offer.minPrice, offer.onlySellTo);
    }

    function withdrawFees() external onlyOwner {
        require(fees > 0);

        uint toWithdraw = fees;
        fees = 0;

        owner.transfer(toWithdraw);
        FeeWithdrawn(toWithdraw);
    }

}
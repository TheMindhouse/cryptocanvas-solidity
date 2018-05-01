pragma solidity 0.4.21;

import "./BiddableCanvas.sol";

/**
* @dev  This contract takes trading our artworks. Trading can happen
*       if artwork has been initially bought. 
*/
contract CanvasMarket is BiddableCanvas {

    mapping(uint32 => SellOffer) canvasForSale;
    mapping(uint32 => BuyOffer) buyOffers;

    event CanvasOfferedForSale(uint32 indexed canvasId, uint minPrice, address indexed from, address indexed to);
    event SellOfferCancelled(uint32 indexed canvasId, uint minPrice, address indexed from, address indexed to);
    event CanvasSold(uint32 indexed canvasId, uint amount, address indexed from, address indexed to);
    event BuyOfferMade(uint32 indexed canvasId, address buyer, uint amount);
    event BuyOfferCancelled(uint32 indexed canvasId, address buyer, uint amount);

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
    *           that artwork, that bid will be canceled.
    */
    function acceptSellOffer(uint32 _canvasId)
    external
    payable
    stateOwned(_canvasId)
    forceOwned(_canvasId) {

        Canvas storage canvas = _getCanvas(_canvasId);
        SellOffer memory sellOffer = canvasForSale[_canvasId];

        require(msg.sender != canvas.owner);
        //don't sell for the owner
        require(sellOffer.isForSale);
        require(msg.value >= sellOffer.minPrice);
        require(sellOffer.seller == canvas.owner);
        //seller is no longer owner
        require(sellOffer.onlySellTo == 0x0 || sellOffer.onlySellTo == msg.sender);
        //protect from selling to unintended address

        uint fee = _calculateCommission(msg.value);
        uint toTransfer = msg.value - fee;

        addPendingWithdrawal(sellOffer.seller, toTransfer);
        addPendingWithdrawal(owner, fee);

        addressToCount[canvas.owner]--;
        addressToCount[msg.sender]++;

        canvas.owner = msg.sender;
        cancelSellOfferInternal(_canvasId, false);

        emit CanvasSold(_canvasId, msg.value, sellOffer.seller, msg.sender);

        //If the buyer have placed buy offer, refound it 
        BuyOffer memory offer = buyOffers[_canvasId];
        if (offer.buyer == msg.sender) {
            buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
            if (offer.amount > 0) {
                //refund offer
                addPendingWithdrawal(offer.buyer, offer.amount);
            }
        }

    }

    function offerCanvasForSale(uint32 _canvasId, uint _minPrice) external {
        _offerCanvasForSaleInternal(_canvasId, _minPrice, 0x0);
    }

    function offerCanvasForSaleToAddress(uint32 _canvasId, uint _minPrice, address _receiver) external {
        _offerCanvasForSaleInternal(_canvasId, _minPrice, _receiver);
    }

    function cancelSellOffer(uint32 _canvasId) external {
        cancelSellOfferInternal(_canvasId, true);
    }

    function makeBuyOffer(uint32 _canvasId) external payable stateOwned(_canvasId) forceOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        BuyOffer storage existing = buyOffers[_canvasId];

        require(canvas.owner != msg.sender);
        require(canvas.owner != 0x0);
        require(msg.value > existing.amount);

        if (existing.amount > 0) {
            //refund previous buy offer.
            addPendingWithdrawal(existing.buyer, existing.amount);
        }

        buyOffers[_canvasId] = BuyOffer(true, msg.sender, msg.value);
        emit BuyOfferMade(_canvasId, msg.sender, msg.value);
    }

    function cancelBuyOffer(uint32 _canvasId) external stateOwned(_canvasId) forceOwned(_canvasId) {
        BuyOffer memory offer = buyOffers[_canvasId];
        require(offer.buyer == msg.sender);

        buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
        if (offer.amount > 0) {
            //refund offer
            addPendingWithdrawal(offer.buyer, offer.amount);
        }

        emit BuyOfferCancelled(_canvasId, offer.buyer, offer.amount);
    }

    function acceptBuyOffer(uint32 _canvasId, uint _minPrice) external stateOwned(_canvasId) forceOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);

        BuyOffer memory offer = buyOffers[_canvasId];
        require(offer.amount > 0);
        require(offer.buyer != 0x0);
        require(offer.amount >= _minPrice);

        uint fee = _calculateCommission(offer.amount);
        uint toTransfer = offer.amount - fee;

        addressToCount[canvas.owner]--;
        addressToCount[offer.buyer]++;

        canvas.owner = offer.buyer;
        addPendingWithdrawal(msg.sender, toTransfer);
        addPendingWithdrawal(owner, fee);

        buyOffers[_canvasId] = BuyOffer(false, 0x0, 0);
        canvasForSale[_canvasId] = SellOffer(false, 0x0, 0, 0x0);

        emit CanvasSold(_canvasId, offer.amount, msg.sender, offer.buyer);
    }

    function getCurrentBuyOffer(uint32 _canvasId)
    external
    view
    returns (bool hasOffer, address buyer, uint amount) {
        BuyOffer storage offer = buyOffers[_canvasId];
        return (offer.hasOffer, offer.buyer, offer.amount);
    }

    function getCurrentSellOffer(uint32 _canvasId)
    external
    view
    returns (bool isForSale, address seller, uint minPrice, address onlySellTo) {

        SellOffer storage offer = canvasForSale[_canvasId];
        return (offer.isForSale, offer.seller, offer.minPrice, offer.onlySellTo);
    }

    function _offerCanvasForSaleInternal(uint32 _canvasId, uint _minPrice, address _receiver)
    private
    stateOwned(_canvasId)
    forceOwned(_canvasId) {

        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);
        require(_receiver != canvas.owner);

        canvasForSale[_canvasId] = SellOffer(true, msg.sender, _minPrice, _receiver);
        emit CanvasOfferedForSale(_canvasId, _minPrice, msg.sender, _receiver);
    }

    function cancelSellOfferInternal(uint32 _canvasId, bool emitEvent)
    private
    stateOwned(_canvasId)
    forceOwned(_canvasId) {

        Canvas storage canvas = _getCanvas(_canvasId);
        SellOffer memory oldOffer = canvasForSale[_canvasId];

        require(canvas.owner == msg.sender);
        require(oldOffer.isForSale); //don't allow to cancel if there is no offer

        canvasForSale[_canvasId] = SellOffer(false, msg.sender, 0, 0x0);

        if (emitEvent) {
            emit SellOfferCancelled(_canvasId, oldOffer.minPrice, oldOffer.seller, oldOffer.onlySellTo);
        }
    }

}
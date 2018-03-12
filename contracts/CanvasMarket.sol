pragma solidity 0.4.21;

import './BiddableCanvas.sol';

/**
* @dev  This contract takes trading our artworks. Trading can happen
*       if artwork has been initially bought. 
*/
contract CanvasMarket is BiddableCanvas { 

    mapping (uint32 => SaleOffer) artworksForSale; 
    mapping (uint32 => BuyOffer) buyOffers; 
    uint public fees;     

    event ArtworkOfferedForSale(uint32 artworkId, uint minPrice, address toAddress);
    event ArtworkNoLongerForSale(uint32 _artworkId);
    event ArtworkSold(uint32 artworkId, uint amount, address from, address to);
    event FeeWithdrawn(uint amount);
    event BuyOfferMade(uint32 artworkId, address buyer, uint amount);
    event BuyOfferCancelled(uint32 artworkId, address buyer, uint amount);

    struct SaleOffer {
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
    function buyArtwork(uint32 _artworkId) public payable {
        Canvas storage canvas = _getCanvas(_artworkId);
        SaleOffer storage saleOffer = artworksForSale[_artworkId];

        require(msg.sender != canvas.owner); //don't sell for the owner
        require(saleOffer.isForSale);
        require(msg.value >= saleOffer.minPrice);
        require(saleOffer.seller != canvas.owner); //seller is no longer owner 
        require(saleOffer.onlySellTo == 0x0 || saleOffer.onlySellTo == msg.sender); //protect from selling to unintented address

        uint fee = msg.value / COMMISSION;
        uint toTransfer = msg.value - fee; 

        saleOffer.seller.transfer(toTransfer);
        fees += fee; 

        canvas.owner = msg.sender;
        artworkNoLongerForSale(_artworkId);

        ArtworkSold(_artworkId, msg.value, saleOffer.seller, msg.sender);
        
        //TODO make sure you refund all bidding for artwork !!!
    }

    function offerArtworkForSale(uint32 _artworkId, uint _minPrice) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(true, msg.sender, _minPrice, 0x0);
        ArtworkOfferedForSale(_artworkId, _minPrice, 0x0);
    }

    function offerArtworkForSaleToAddress(uint32 _artworkId, uint _minPrice, address _receiver) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(true, msg.sender, _minPrice, _receiver);
        ArtworkOfferedForSale(_artworkId, _minPrice, _receiver);
    }

    function artworkNoLongerForSale(uint32 _artworkId) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(false, msg.sender, 0, 0x0);
        ArtworkNoLongerForSale(_artworkId);
    }

    function enterBuyOffer(uint32 _artworkId) biddingFinished(_artworkId) public payable {
        Canvas storage canvas = _getCanvas(_artworkId);
        BuyOffer existing = buyOffers[_artworkId];

        require(canvas.owner != msg.sender);
        require(canvas.owner != 0x0);
        require(msg.value > existing.amount);
        
        if (existing.amount > 0) {
            //refund previous buy offer. 
            existing.buyer.transfer(existing.amount);
        }

        buyOffers[_artworkId] = BuyOffer(true, msg.sender, msg.value);
        BuyOfferMade(_artworkId, msg.sender, msg.value);
    }

    function cancelBuyOffer(uint32 _artworkId) biddingFinished(_artworkId) public {
        BuyOffer storage offer = buyOffers[_artworkId];
        require(offer.buyer == msg.sender);

        buyOffers[_artworkId] = BuyOffer(false, 0x0, 0);
        if (offer.amount > 0) {
            //refund offer
            offer.buyer.transfer(offer.amount);
        }

        BuyOfferCancelled(_artworkId, offer.buyer, offer.amount);
    }

    function withdrawFees() public onlyOwner {
        require(fees > 0);
        
        uint toWithdraw = fees; 
        fees = 0;

        owner.transfer(toWithdraw);
        FeeWithdrawn(toWithdraw);
    }

}
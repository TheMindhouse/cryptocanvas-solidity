pragma solidity 0.4.21;

import './BiddableCanvas.sol';

/**
* @dev This contract takes trading our artworks. Trading can happen
*      if artwork has been initially bought. 
*/
contract CanvasMarket is BiddableCanvas { 

    mapping (uint32 => SaleOffer) artworksForSale; 

    event ArtworkOfferedForSale(uint32 _artworkId, uint _minPrice, address _toAddress);
    event ArtworkNoLongerForSale(uint32 _artworkId);

    struct SaleOffer {
        bool isForSale;
        uint artworkId;
        address seller;
        uint minPrice;         
        address onlySellTo;     // specify to sell only to a specific address
    }

    function offerArtworkForSale(uint32 _artworkId, uint _minPrice) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(true, _artworkId, msg.sender, _minPrice, 0x0);
        ArtworkOfferedForSale(_artworkId, _minPrice, 0x0);
    }

    function offerArtworkForSaleToAddress(uint32 _artworkId, uint _minPrice, address _receiver) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(true, _artworkId, msg.sender, _minPrice, _receiver);
        ArtworkOfferedForSale(_artworkId, _minPrice, _receiver);
    }

    function artworkNoLongerForSalw(uint32 _artworkId) public biddingFinished(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        require(canvas.owner == msg.sender);

        artworksForSale[_artworkId] = SaleOffer(false, _artworkId, msg.sender, 0, 0x0);
        ArtworkNoLongerForSale(_artworkId);
    }

}
pragma solidity 0.4.21;

import './CanvasMarket.sol';

/**
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket { 

    function getCanvasInfo(uint32 _artworkId) public view returns(CanvasInfo) {
        Canvas storage canvas = _getCanvas(_artworkId);

        return CanvasInfo(_artworkId, canvas.paintedPixelsCount, canvas.owner);
    }

    struct CanvasInfo {
        uint32 id; 
        uint32 paintedPixels;

        /**
        * @notice   Address can reffer to 0x0 if there is no owner. 
        */
        address owner; 
    }

} 
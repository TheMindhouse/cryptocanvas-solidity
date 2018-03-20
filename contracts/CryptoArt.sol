pragma solidity 0.4.21;

import './CanvasMarket.sol';

/**
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket {

    function getCanvasInfo(uint32 _canvasId) public view returns (
        uint32 id,
        uint32 paintedPixels,
        bool isFinished,
        uint8 canvasState,
        address owner
    ) {
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, canvas.paintedPixelsCount, _isArtworkFinished(canvas), getCanvasState(_canvasId), canvas.owner);
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
pragma solidity 0.4.21;

import "./CanvasMarket.sol";

/**
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket {

    function getCanvasInfo(uint32 _canvasId) external view returns (
        uint32 id,
        uint32 paintedPixels,
        bool isFinished,
        uint8 canvasState,
        address owner
    ) {
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, canvas.paintedPixelsCount, _isCanvasFinished(canvas), getCanvasState(_canvasId), canvas.owner);
    }
    
} 
pragma solidity ^0.4.0;

import "./CanvasFactory.sol";

/**
* @notice   Useful methods to manage canvas' state.
*/
contract CanvasState is CanvasFactory {

    modifier stateBidding(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_INITIAL_BIDDING);
        _;
    }

    modifier stateOwned(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_OWNED);
        _;
    }

    /**
    * Ensures that canvas's saved state is STATE_OWNED.
    *
    * Because initial bidding is based on current time, we had to find a way to
    * trigger saving new canvas state. Every transaction (not a call) that
    * requires state owned should use it modifier as a last one.
    *
    * Thank's to that, we can make sure, that canvas state gets updated.
    */
    modifier forceOwned(uint32 _canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        if (canvas.state != STATE_OWNED) {
            canvas.state = STATE_OWNED;
        }
        _;
    }

    /**
    * @notice   Returns current canvas state.
    */
    function getCanvasState(uint32 _canvasId) public view returns (uint8) {
        Canvas storage canvas = _getCanvas(_canvasId);
        if (canvas.state != STATE_INITIAL_BIDDING) {
            //if state is set to owned, or not finished
            //it means it doesn't depend on current time -
            //we don't have to double check
            return canvas.state;
        }

        //state initial bidding - as that state depends on
        //current time, we have to double check if initial bidding
        //hasn't finish yet
        uint finishTime = canvas.initialBiddingFinishTime;
        if (finishTime == 0 || finishTime > getTime()) {
            return STATE_INITIAL_BIDDING;

        } else {
            return STATE_OWNED;
        }
    }

    /**
    * @notice   Returns all canvas' id for a given state.
    */
    function getCanvasByState(uint8 _state) external view returns (uint32[]) {
        uint size;
        if (_state == STATE_NOT_FINISHED) {
            size = activeCanvasCount;
        } else {
            size = getCanvasCount() - activeCanvasCount;
        }

        uint32[] memory result = new uint32[](size);
        uint currentIndex = 0;

        for (uint32 i = 0; i < canvases.length; i++) {
            if (getCanvasState(i) == _state) {
                result[currentIndex] = i;
                currentIndex++;
            }
        }

        return _slice(result, 0, currentIndex);
    }

    /**
    * Sets canvas name. Only for the owner of the canvas. Name can be an empty
    * string which is the same as lack of the name.
    */
    function setCanvasName(uint32 _canvasId, string _name) external
    stateOwned(_canvasId)
    forceOwned(_canvasId)
    {
        bytes memory _strBytes = bytes(_name);
        require(_strBytes.length <= MAX_CANVAS_NAME_LENGTH);

        Canvas storage _canvas = _getCanvas(_canvasId);
        require(msg.sender == _canvas.owner);

        _canvas.name = _name;
        emit CanvasNameSet(_canvasId, _name);
    }

    /**
    * @dev  Slices array from start (inclusive) to end (exclusive).
    *       Doesn't modify input array.
    */
    function _slice(uint32[] memory _array, uint _start, uint _end) internal pure returns (uint32[]) {
        require(_start <= _end);

        if (_start == 0 && _end == _array.length) {
            return _array;
        }

        uint size = _end - _start;
        uint32[] memory sliced = new uint32[](size);

        for (uint i = 0; i < size; i++) {
            sliced[i] = _array[i + _start];
        }

        return sliced;
    }

}

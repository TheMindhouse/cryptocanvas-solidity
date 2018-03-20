pragma solidity 0.4.21;

import './Ownable.sol';

/**
* @dev This contract takes care of painting on canvases, returning artworks and creating ones. 
*/
contract CanvasFactory is Ownable {

    uint8 public constant WIDTH = 64;
    uint8 public constant HEIGHT = 64;
    uint32 public constant PIXEL_COUNT = 4096; //WIDTH * HEIGHT doesn't work for some reason

    uint public constant ADDRESS_COOLDOWN = 30 seconds;

    uint8 public constant MAX_CANVAS_COUNT = 100;
    uint8 public constant MAX_ACTIVE_CANVAS = 10;

    Canvas[] artworks;
    uint32 public activeCanvasCount = 0;

    event PixelPainted(uint32 _canvasId, uint32 _index, uint8 _color);
    event CanvasFinished(uint32 _canvasId);
    event CanvasCreated(uint _id);

    modifier onlyReadyAddress(uint32 _canvasId) {
        Canvas storage canvas = artworks[_canvasId];
        require(canvas.addressToReadyTime[msg.sender] < now);
        _;
    }

    modifier notFinished(uint32 _canvasId) {
        require(!isArtworkFinished(_canvasId));
        _;
    }

    modifier finished(uint32 _canvasId) {
        require(isArtworkFinished(_canvasId));
        _;
    }

    modifier validPixelIndex(uint32 _pixelIndex) {
        require(_pixelIndex < PIXEL_COUNT);
        _;
    }

    function createCanvas() public {
        require(artworks.length <= MAX_CANVAS_COUNT);
        require(activeCanvasCount <= MAX_ACTIVE_CANVAS);

        uint id = artworks.push(Canvas(0, 0)) - 1;

        CanvasCreated(id);
        activeCanvasCount++;
    }

    /**
    * @returns  Cooldown of address that called that function
    */
    function setPixel(uint32 _canvasId, uint32 _index, uint8 _color) public onlyReadyAddress(_canvasId) notFinished(_canvasId) validPixelIndex(_index) returns (uint cooldownTime) {
        require(_color > 0);
        
        Canvas storage canvas = _getCanvas(_canvasId);
        Pixel storage pixel = canvas.pixels[_index];

        // pixel always has a painter. If it's equal to address(0) it means 
        // that pixel hasn't been set.
        if (pixel.painter == 0x0) {
            canvas.paintedPixelsCount++;
        }

        Pixel memory newPixel = Pixel(_color, msg.sender);
        canvas.pixels[_index] = newPixel;

        uint cooldownTime = now + ADDRESS_COOLDOWN;
        canvas.addressToReadyTime[msg.sender] = cooldownTime;

        if (_isArtworkFinished(canvas)) {
            activeCanvasCount--;
            CanvasFinished(_canvasId);
        }

        PixelPainted(_canvasId, _index, _color);
        return cooldownTime;
    }

    function getArtwork(uint32 _canvasId) public view returns (uint8[]) {
        Canvas storage canvas = _getCanvas(_canvasId);
        uint8[] memory result = new uint8[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            result[i] = canvas.pixels[i].color;
        }

        return result;
    }

    /**
    * @notice   Functions returns array of booleans. Each boolean corresponds to 
    *           pixels. True means pixel has been painted by user, false means
    *           that pixel hasn't been painted by user (it will be white).
    */
    function mapPaintedPixels(uint32 _canvasId) public view returns (bool[]) {
        Canvas storage canvas = _getCanvas(_canvasId);
        bool[] memory result = new bool[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            if (canvas.pixels[i].painter != 0x0) {
                result[i] = true;
            }
        }

        return result;
    }

    function getArtworkPaintedPixels(uint32 _canvasId) public view returns (uint32) {
        return _getCanvas(_canvasId).paintedPixelsCount;
    }

    function getPixelCount() public pure returns (uint) {
        return PIXEL_COUNT;
    }

    /**
    * @notice   Returns amount of created canvases.
    */
    function getArtworksCount() public view returns (uint) {
        return artworks.length;
    }

    function isArtworkFinished(uint32 _canvasId) public view returns (bool) {
        return _isArtworkFinished(_getCanvas(_canvasId));
    }

    function getPixelAuthor(uint32 _canvasId, uint32 _pixelIndex) public view validPixelIndex(_pixelIndex) returns (address) {
        return _getCanvas(_canvasId).pixels[_pixelIndex].painter;
    }

    function _countPaintedPixels(address _address, uint32 _canvasId) internal view returns (uint32) {
        Canvas storage canvas = _getCanvas(_canvasId);
        uint32 count = 0;

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            if (canvas.pixels[i].painter == _address) {
                count++;
            }
        }

        return count;
    }

    function _isArtworkFinished(Canvas canvas) internal pure returns (bool) {
        return canvas.paintedPixelsCount == PIXEL_COUNT;
    }

    function _getCanvas(uint32 _canvasId) internal view returns (Canvas storage) {
        require(_canvasId < artworks.length);
        return artworks[_canvasId];
    }

    struct Pixel {
        uint8 color;
        address painter;
    }

    struct Canvas {
        /**
        * Map of all pixels. 
        */
        mapping(uint32 => Pixel) pixels;

        /**
        * Owner of canvas. Canvas doesn't have an owner until initial bidding ends. 
        */
        address owner;

        /**
        * Numbers of pixels set. Canvas will be considered finished when all pixels will be set.
        * Technically it means that setPixelsCount == PIXEL_COUNT
        */
        uint32 paintedPixelsCount;

        /**
        * Time when given addres can paint on that canvas
        */
        mapping(address => uint) addressToReadyTime;

    }
}
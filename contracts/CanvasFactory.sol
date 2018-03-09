pragma solidity 0.4.21;

import './Ownable.sol';

/**
* @dev This contract takes care of painting on canvases, returning artworks and creating ones. 
*/
contract CanvasFactory {

    uint8 public constant WIDTH = 100;
    uint8 public constant HEIGHT = 100;
    uint32 public constant PIXEL_COUNT = WIDTH * HEIGHT; 
    uint public constant ADDRESS_COOLDOWN = 3 minutes;

    uint8 public constant MAX_CANVAS_COUNT = 100;

    //After this percent of filled pixels finish time of a canvas is set
    uint8 public constant FINISH_TIME_TRIGGER = 90;
    uint public constant CANVAS_FINISH_TIME = 24 hours; 
    
    Canvas[] artworks;

    event PixelPainted(uint32 _artworkId, uint8 _x, uint8 _y, uint8 _color);

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

    function setPixel(uint32 _artworkId, uint8 _x, uint8 _y, uint8 _color) public onlyReadyAddress(_artworkId) notFinished(_artworkId) {
        uint32 index = _getPixelIndex(_x, _y);
        Canvas storage canvas = _getCanvas(_artworkId);        

        Pixel storage pixel = canvas.pixels[index];
        if (pixel != 0) {
            canvas.addressToCount[pixel.painter]--;
        } else {
            canvas.paintedPixelsCount++;
        }
        canvas.addressToCount[msg.sender]++;

        Pixel memory newPixel = Pixel(_invertColor(_color), msg.sender);
        canvas.pixels[index] = newPixel;

        canvas.addressToReadyTime[msg.sender] = now + ADDRESS_COOLDOWN;

        PixelPainted(_artworkId, _x, _y, _color);
    }

    function getArtwork(uint32 _artworkId) public view returns(uint8[]) {
        Canvas storage canvas = _getCanvas(_artworkId);
        uint8[] memory result = new uint8[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            result[i] = _invertColor(canvas.pixels[i].color);
        }

        return result; 
    }

    /**
    * @notice Returns amount of created canvases.
    */
    function getArtworksCount() public view returns(uint) {
        return artworks.length;
    }

    function isArtworkFinished(uint32 _artworkId) public view returns(bool) {
        return _getCanvas(_artworkId).paintedPixelsCount == PIXEL_COUNT;
    }

    function _getCanvas(uint32 _artworkId) internal view returns(Canvas storage) {
        require(_artworkId < artworks.length);
        return artworks[_artworkId];
    }

    function _getPixelIndex(uint32 _x, uint32 _y) internal pure returns(uint32) {
        require(_x < WIDTH);
        require(_y < HEIGHT);

        return _y * WIDTH + _x;
    }

    function _invertColor(uint8 _color) internal pure returns(uint8) {
        return 0xFF - _color;
    }

    struct Pixel {
        uint8 color; 
        address painter;
    }

    struct Canvas {
        /**
        * Map of all pixels. 
        */
        mapping (uint32 => Pixel) pixels;

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
        * How many pixels has given address drawn. 
        */
        mapping (address => uint32) addressToCount;
        
        /**
        * Mapping that shows if address has been paid for its contribution for artwork.
        */
        mapping (address => bool) addressToIsPaid;

        /**
        * Time when given addres can paint on that canvas
        */
        mapping (address => uint) addressToReadyTime;

    }
}
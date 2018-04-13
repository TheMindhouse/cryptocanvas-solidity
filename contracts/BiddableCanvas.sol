pragma solidity 0.4.21;

import "./CanvasFactory.sol";
import "./Withdrawable.sol";

/**
* @dev This contract takes care of initial bidding.
*/
contract BiddableCanvas is CanvasFactory, Withdrawable {

    //@dev It means canvas is not finished yet, and bidding is not possible. 
    uint8 public constant STATE_NOT_FINISHED = 0;

    //@dev  there is ongoing bidding and anybody can bid. If there canvas can have 
    //      assigned owner, but it can change if someone will over-bid him. 
    uint8 public constant STATE_INITIAL_BIDDING = 1;

    //@dev canvas has been sold, and has the owner
    uint8 public constant STATE_OWNED = 2;

    /**
    * As it's hard to operate on floating numbers, each fee will be calculated like this:
    * PRICE * COMMISSION / COMMISSION_DIVIDER. It's impossible to keep float number here.
    *
    * ufixed COMMISSION = 0.039; may seem useful, but it's not possible to multiply ufixed * uint.
    */
    uint public constant COMMISSION = 39;
    uint public constant COMMISSION_DIVIDER = 1000;

    uint public constant BIDDING_DURATION = 48 hours;

    mapping(uint32 => Bid) bids;
    mapping(address => uint32) addressToCount;

    uint public minimumBidAmount = 0.08 ether;

    event BidPosted(uint32 indexed canvasId, address bidder, uint amount, uint finishTime);
    event RewardAddedToWithdrawals(uint32 indexed canvasId, address toAddress, uint amount);
    event CommissionAddedToWithdrawals(uint32 indexed canvasId, uint amount);

    modifier stateBidding(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_INITIAL_BIDDING);
        _;
    }

    modifier stateOwned(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_OWNED);
        _;
    }

    /**
    * Places bid for canvas that is in the state STATE_INITIAL_BIDDING.
    * If somebody is outbid his pending withdrawals will be to topped up.
    */
    function makeBid(uint32 _canvasId) external payable stateBidding(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        Bid storage oldBid = bids[_canvasId];

        require(!canvas.secured);

        if (msg.value < minimumBidAmount || msg.value <= oldBid.amount) {
            revert();
        }

        if (oldBid.bidder != 0x0 && oldBid.amount > 0) {
            //return old bidder his money
            addPendingWithdrawal(oldBid.bidder, oldBid.amount);
        }

        uint finishTime = canvas.initialBiddingFinishTime;
        if (finishTime == 0) {
            canvas.initialBiddingFinishTime = getTime() + BIDDING_DURATION;
        }

        bids[_canvasId] = Bid(msg.sender, msg.value);

        if (canvas.owner != 0x0) {
            addressToCount[canvas.owner]--;
        }
        canvas.owner = msg.sender;
        addressToCount[msg.sender]++;

        BidPosted(_canvasId, msg.sender, msg.value, canvas.initialBiddingFinishTime);
    }

    function getLastBidForCanvas(uint32 _canvasId) external view returns (uint32 canvasId, address bidder, uint amount, uint finishTime) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, bid.bidder, bid.amount, canvas.initialBiddingFinishTime);
    }

    function getCanvasState(uint32 _canvasId) public view returns (uint8) {
        Canvas storage canvas = _getCanvas(_canvasId);

        if (_isCanvasFinished(canvas)) {
            if (canvas.secured) {
                return STATE_OWNED;
            }

            uint finishTime = canvas.initialBiddingFinishTime;
            if (finishTime == 0 || finishTime > getTime()) {
                return STATE_INITIAL_BIDDING;

            } else {
                return STATE_OWNED;
            }

        } else {
            return STATE_NOT_FINISHED;
        }
    }

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

    function calculateReward(uint32 _canvasId, address _address) public view stateOwned(_canvasId) returns (uint32 pixelsCount, uint reward, bool isPaid) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        uint32 paintedPixels = getPaintedPixelsCountByAddress(_address, _canvasId);
        uint pricePerPixel = _calculatePricePerPixel(bid.amount);
        uint _reward = paintedPixels * pricePerPixel;

        return (paintedPixels, _reward, canvas.isAddressPaid[_address]);
    }

    /**
    * Withdraws reward for contributing in canvas. Calculating reward has to be triggered
    * and calculated per canvas. Because of that it is not enough to call function
    * withdraw(). Caller has to call  addRewardToPendingWithdrawals() separately.
    */
    function addRewardToPendingWithdrawals(uint32 _canvasId) external stateOwned(_canvasId) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        uint32 pixelCount;
        uint reward;
        bool isPaid;
        (pixelCount, reward, isPaid) = calculateReward(_canvasId, msg.sender);

        require(pixelCount > 0);
        require(reward > 0);
        require(!isPaid);

        canvas.isAddressPaid[msg.sender] = true;
        addPendingWithdrawal(msg.sender, reward);

        RewardAddedToWithdrawals(_canvasId, msg.sender, reward);
    }

    function calculateCommission(uint32 _canvasId) public view stateOwned(_canvasId) returns (uint commission, bool isPaid) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_calculateCommission(bid.amount), canvas.isCommissionPaid);
    }

    function addCommissionToPendingWithdrawals(uint32 _canvasId) external onlyOwner stateOwned(_canvasId) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        uint commission;
        bool isPaid;
        (commission, isPaid) = calculateCommission(_canvasId);

        require(commission > 0);
        require(!isPaid);

        canvas.isCommissionPaid = true;
        addPendingWithdrawal(owner, commission);

        CommissionAddedToWithdrawals(_canvasId, commission);
    }

    /**
    * Secures canvas. Can be called just once, by the owner of the canvas.
    * When secured, canvas will be time-manipulation proof. It means that
    * nobody will be able to "go back in time" and pretend that initial
    * bidding is still on.
    */
    function secure(uint32 _canvasId) external stateOwned(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        require(canvas.owner == msg.sender);
        require(!canvas.secured);

        canvas.secured = true;
    }

    function balanceOf(address _owner) external view returns (uint) {
        return addressToCount[_owner];
    }

    function setMinimumBidAmount(uint _amount) external onlyOwner {
        minimumBidAmount = _amount;
    }

    function _calculatePricePerPixel(uint _totalPrice) private pure returns (uint) {
        return (_totalPrice - _calculateCommission(_totalPrice)) / PIXEL_COUNT;
    }

    function _calculateCommission(uint _amount) internal pure returns (uint) {
        return (_amount * COMMISSION) / COMMISSION_DIVIDER;
    }

    /**
    * @dev  Slices array from start (inclusive) to end (exclusive).
    *       Doesn't modify input array.
    */
    function _slice(uint32[] memory _array, uint _start, uint _end) private pure returns (uint32[]) {
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

    struct Bid {
        address bidder;
        uint amount;
    }

}
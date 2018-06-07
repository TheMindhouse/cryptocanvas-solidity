pragma solidity 0.4.24;

import "./CanvasFactory.sol";
import "./Withdrawable.sol";

/**
* @dev This contract takes care of initial bidding.
*/
contract BiddableCanvas is CanvasFactory, Withdrawable {

    /**
    * As it's hard to operate on floating numbers, each fee will be calculated like this:
    * PRICE * COMMISSION / COMMISSION_DIVIDER. It's impossible to keep float number here.
    *
    * ufixed COMMISSION = 0.039; may seem useful, but it's not possible to multiply ufixed * uint.
    */
    uint public constant COMMISSION = 39;
    uint public constant COMMISSION_DIVIDER = 1000;

    uint8 public constant ACTION_INITIAL_BIDDING = 0;
    uint8 public constant ACTION_SELL_OFFER_ACCEPTED = 1;
    uint8 public constant ACTION_BUY_OFFER_ACCEPTED = 2;

    uint public constant BIDDING_DURATION = 48 hours;

    mapping(uint32 => Bid) bids;
    mapping(address => uint32) addressToCount;

    uint public minimumBidAmount = 0.1 ether;

    event BidPosted(uint32 indexed canvasId, address indexed bidder, uint amount, uint finishTime);
    event RewardAddedToWithdrawals(uint32 indexed canvasId, address indexed toAddress, uint amount);
    event CommissionAddedToWithdrawals(uint32 indexed canvasId, uint amount, uint8 indexed action);

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
    * Places bid for canvas that is in the state STATE_INITIAL_BIDDING.
    * If somebody is outbid his pending withdrawals will be to topped up.
    */
    function makeBid(uint32 _canvasId) external payable stateBidding(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        Bid storage oldBid = bids[_canvasId];

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

        emit BidPosted(_canvasId, msg.sender, msg.value, canvas.initialBiddingFinishTime);
    }

    /**
    * @notice   Returns last bid for canvas. If the initial bidding has been
    *           already finished that will be winning offer.
    */
    function getLastBidForCanvas(uint32 _canvasId) external view returns (uint32 canvasId, address bidder, uint amount, uint finishTime) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, bid.bidder, bid.amount, canvas.initialBiddingFinishTime);
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
    * @notice   Returns reward for painting pixels in wei. That reward is proportional
    *           to number of set pixels. For example let's assume that the address has painted
    *           2048 pixels, which is 50% of all pixels. He will be rewarded
    *           with 50% of winning bid minus fee.
    */
    function calculateReward(uint32 _canvasId, address _address)
    public
    view
    stateOwned(_canvasId)
    returns (uint32 pixelsCount, uint reward, bool isPaid) {

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
    function addRewardToPendingWithdrawals(uint32 _canvasId)
    external
    stateOwned(_canvasId)
    forceOwned(_canvasId) {
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

        emit RewardAddedToWithdrawals(_canvasId, msg.sender, reward);
    }

    /**
    * @notice   Calculates commission that has been charged for selling the canvas.
    */
    function calculateCommission(uint32 _canvasId)
    public
    view
    stateOwned(_canvasId)
    returns (uint commission, bool isPaid) {

        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        uint _commission;
        uint _pricePerPixel;
        (_commission, _pricePerPixel) = _splitMoney(bid.amount);

        return (_commission, canvas.isCommissionPaid);
    }

    /**
    * @notice   Only for the owner of the contract. Adds commission to the owner's
    *           pending withdrawals.
    */
    function addCommissionToPendingWithdrawals(uint32 _canvasId)
    external
    onlyOwner
    stateOwned(_canvasId)
    forceOwned(_canvasId) {

        Canvas storage canvas = _getCanvas(_canvasId);

        uint commission;
        bool isPaid;
        (commission, isPaid) = calculateCommission(_canvasId);

        require(commission > 0);
        require(!isPaid);

        canvas.isCommissionPaid = true;
        addPendingWithdrawal(owner, commission);

        emit CommissionAddedToWithdrawals(_canvasId, commission, ACTION_INITIAL_BIDDING);
    }

    /**
    * Sets canvas name. Only for the owner of the canvas. Name can be an empty
    * string which is the same as lack of the name.
    */
    function setCanvasName(uint32 _canvasId, string _name) external
    stateOwned(_canvasId)
    forceOwned(_canvasId)
    {
        Canvas storage _canvas = _getCanvas(_canvasId);
        require(msg.sender == _canvas.owner);

        _canvas.name = _name;
        emit CanvasNameSet(_canvasId, _name);
    }

    /**
    * @notice   Returns number of canvases owned by the given address.
    */
    function balanceOf(address _owner) external view returns (uint) {
        return addressToCount[_owner];
    }

    /**
    * @notice   Only for the owner of the contract. Sets minimum bid amount.
    */
    function setMinimumBidAmount(uint _amount) external onlyOwner {
        minimumBidAmount = _amount;
    }

    /**
    * Splits money between owner of the contract and painters.
    * Returned commission may be slightly a bit higher then percentage value.
    * It's caused by the fact that _calculatePricePerPixel() function
    * operates on the integer values. Division that is calculated over there
    * may leave a remainder.
    */
    function _splitMoney(uint _amount) internal pure returns (
        uint commission,
        uint pricePerPixel
    ) {
        uint totalRewards = _calculateTotalRewards(_amount);
        uint totalCommission = _amount - totalRewards;

        return (totalCommission, _calculatePricePerPixel(_amount));
    }

    function _calculatePricePerPixel(uint _totalPrice) private pure returns (uint) {
        return (_totalPrice - _calculateCut(_totalPrice)) / PIXEL_COUNT;
    }

    /**
    * Calculates total amount of rewards to be paid.
    */
    function _calculateTotalRewards(uint _totalPrice) private pure returns (uint) {
        return PIXEL_COUNT * _calculatePricePerPixel(_totalPrice);
    }

    /**
    * Calculates cut from the value. Currently 3.9%.
    */
    function _calculateCut(uint _amount) internal pure returns (uint) {
        return (_amount * COMMISSION) / COMMISSION_DIVIDER;
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

    struct Bid {
        address bidder;
        uint amount;
    }

}
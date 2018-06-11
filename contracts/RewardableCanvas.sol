pragma solidity 0.4.24;

import "./CanvasState.sol";

/**
* @notice   Keeps track of all rewards and commissions.
*           Commission - fee that we charge for using CryptoCanvas.
*           Reward - painters cut.
*/
contract RewardableCanvas is CanvasState {

    /**
    * As it's hard to operate on floating numbers, each fee will be calculated like this:
    * PRICE * COMMISSION / COMMISSION_DIVIDER. It's impossible to keep float number here.
    *
    * ufixed COMMISSION = 0.039; may seem useful, but it's not possible to multiply ufixed * uint.
    */
    uint public constant COMMISSION = 39;
    uint public constant TRADE_REWARD = 61;
    uint public constant PERCENT_DIVIDER = 1000;

    event RewardAddedToWithdrawals(uint32 indexed canvasId, address indexed toAddress, uint amount);
    event CommissionAddedToWithdrawals(uint32 indexed canvasId, uint amount);
    event FeesUpdated(uint32 indexed canvasId, uint totalCommissions, uint totalReward);

    mapping(uint32 => FeeHistory) private canvasToFeeHistory;

    function addCommissionToPendingWithdrawals(uint32 _canvasId)
    public
    onlyOwner
    stateOwned(_canvasId)
    forceOwned(_canvasId) {
        FeeHistory storage _history = _getOrCreateFeeHistory(_canvasId);
        uint _toWithdraw = calculateCommissionToWithdraw(_canvasId);
        uint _lastIndex = _history.commissionCumulative.length - 1;

        _history.paidCommissionIndex = _lastIndex;
        addPendingWithdrawal(owner, _toWithdraw);

        emit CommissionAddedToWithdrawals(_canvasId, _toWithdraw);
    }

    function addRewardToPendingWithdrawals(uint32 _canvasId)
    public
    stateOwned(_canvasId)
    forceOwned(_canvasId) {
        FeeHistory storage _history = _getOrCreateFeeHistory(_canvasId);
        uint _toWithdraw = calculateRewardToWithdraw(_canvasId, msg.sender);
        uint _lastIndex = _history.rewardsCumulative.length - 1;

        _history.addressToPaidRewardIndex[msg.sender] = _lastIndex;
        addPendingWithdrawal(msg.sender, _toWithdraw);

        emit RewardAddedToWithdrawals(_canvasId, msg.sender, _toWithdraw);
    }

    function calculateCommissionToWithdraw(uint32 _canvasId)
    public
    view
    stateOwned(_canvasId)
    returns (uint)
    {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _lastIndex = _history.commissionCumulative.length - 1;
        uint _lastPaidIndex = _history.paidCommissionIndex;

        if (_lastIndex < 0) {
            //means that FeeHistory hasn't been created yet
            return 0;
        }

        uint _commissionSum = _history.commissionCumulative[_lastIndex];
        uint _lastWithdrawn = _history.commissionCumulative[_lastPaidIndex];

        uint _toWithdraw = _commissionSum - _lastWithdrawn;
        require(_toWithdraw <= _commissionSum);

        return _toWithdraw;
    }

    function calculateRewardToWithdraw(uint32 _canvasId, address _address)
    public
    view
    stateOwned(_canvasId)
    returns (uint)
    {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _lastIndex = _history.rewardsCumulative.length - 1;
        uint _lastPaidIndex = _history.addressToPaidRewardIndex[_address];

        if (_lastIndex < 0) {
            //means that FeeHistory hasn't been created yet
            return 0;
        }

        uint _rewardsSum = _history.rewardsCumulative[_lastIndex];
        uint _lastWithdrawn = _history.rewardsCumulative[_lastPaidIndex];
        uint _pixelsOwned = getPaintedPixelsCountByAddress(_address, _canvasId);

        // Our data structure guarantees that _commissionSum is greater or equal to _lastWithdrawn
        uint _toWithdraw = ((_rewardsSum - _lastWithdrawn) / PIXEL_COUNT) * _pixelsOwned;

        return _toWithdraw;
    }

    function getTotalCommission(uint32 _canvasId) external view returns (uint) {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _lastIndex = _history.commissionCumulative.length - 1;

        if (_lastIndex < 0) {
            //means that FeeHistory hasn't been created yet
            return 0;
        }

        return _history.commissionCumulative[_lastIndex];
    }

    function getTotalRewards(uint32 _canvasId) external view returns (uint) {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _lastIndex = _history.rewardsCumulative.length - 1;

        if (_lastIndex < 0) {
            //means that FeeHistory hasn't been created yet
            return 0;
        }

        return _history.rewardsCumulative[_lastIndex];
    }

    /**
    * @notice   Calculates how the initial bidding money will be split.
    *
    * @return  Commission and sum of all painter rewards.
    */
    function splitBid(uint _amount) public pure returns (
        uint commission,
        uint paintersRewards
    ){
        uint _rewardPerPixel = ((_amount - _calculatePercent(_amount, COMMISSION))) / PIXEL_COUNT;
        // Rewards is divisible by PIXEL_COUNT
        uint _rewards = _rewardPerPixel * PIXEL_COUNT;

        return (_amount - _rewards, _rewards);
    }

    /**
    * @notice   Calculates how the money from selling canvas will be split.
    *
    * @return  Commission, sum of painters' rewards and a seller's profit.
    */
    function splitTrade(uint _amount) public pure returns (
        uint commission,
        uint paintersRewards,
        uint sellerProfit
    ){
        uint _commission = _calculatePercent(_amount, COMMISSION);

        // We make sure that painters reward is divisible by PIXEL_COUNT.
        // It is important to split reward across all the painters equally.
        uint _rewardPerPixel = _calculatePercent(_amount, TRADE_REWARD) / PIXEL_COUNT;
        uint _paintersReward = _rewardPerPixel * PIXEL_COUNT;

        uint _sellerProfit = _amount - _commission - _paintersReward;

        //check for the underflow
        require(_sellerProfit < _amount);

        return (_commission, _paintersReward, _sellerProfit);
    }

    /**
    * @notice   Adds a bid to fee history. Doesn't perform any checks if the bid is valid!
    * @return  Returns how the bid was split. Same value as _splitBid function.
    */
    function _registerBid(uint32 _canvasId, uint _amount) internal stateBidding(_canvasId) returns (
        uint commission,
        uint paintersRewards
    ){
        uint _commission;
        uint _rewards;
        (_commission, _rewards) = splitBid(_amount);

        FeeHistory storage _history = _getOrCreateFeeHistory(_canvasId);
        // We have to save the difference between new bid and a previous one.
        // Because we save data as cumulative sum, it's enough to save
        // only the new value.

        _history.commissionCumulative.push(_commission);
        _history.rewardsCumulative.push(_rewards);

        return (_commission, _rewards);
    }

    /**
    * @notice   Adds a bid to fee history. Doesn't perform any checks if the bid is valid!
    * @return  Returns how the trade ethers were split. Same value as splitTrade function.
    */
    function _registerTrade(uint32 _canvasId, uint _amount)
    internal
    stateOwned(_canvasId)
    forceOwned(_canvasId)
    returns (
        uint commission,
        uint paintersRewards,
        uint sellerProfit
    ){
        uint _commission;
        uint _rewards;
        uint _sellerProfit;
        (_commission, _rewards, _sellerProfit) = splitTrade(_amount);

        FeeHistory storage _history = _getOrCreateFeeHistory(_canvasId);
        _pushCumulative(_history.commissionCumulative, _commission);
        _pushCumulative(_history.rewardsCumulative, _rewards);

        return (_commission, _rewards, _sellerProfit);
    }

    /**
    * @notice   Gets a fee history of a canvas. Creates a new fee history
    *           entry if necessary.
    */
    function _getOrCreateFeeHistory(uint32 _canvasId) private returns (FeeHistory storage) {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        if (_history.commissionCumulative.length == 0) {
            //It means that there is no added entrance yet
            //Init cumulative sums with 0, it will make our math easier
            canvasToFeeHistory[_canvasId] = FeeHistory(new uint[](1), new uint[](1), 0);
            _history = canvasToFeeHistory[_canvasId];

        }

        return _history;
    }

    function _pushCumulative(uint[] storage _array, uint _value) private returns (uint) {
        uint _lastValue = _array[_array.length - 1];
        uint _newValue = _lastValue + _value;
        //overflow protection
        require(_newValue >= _lastValue);
        return _array.push(_newValue);
    }

    /**
    * @param    _percent - percent value mapped to scale [0-1000]
    */
    function _calculatePercent(uint _amount, uint _percent) private pure returns (uint) {
        return (_amount * _percent) / PERCENT_DIVIDER;
    }

    struct FeeHistory {

        /**
        * @notice   Cumulative sum of all charged commissions.
        */
        uint[] commissionCumulative;

        /**
        * @notice   Cumulative sum of all charged rewards.
        */
        uint[] rewardsCumulative;

        /**
        * Index of last paid commission (from commissionCumulative array)
        */
        uint paidCommissionIndex;

        /**
        * Mapping showing what rewards has been already paid.
        */
        mapping(address => uint) addressToPaidRewardIndex;

    }

}

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

    /**
    * @notice   Adds all unpaid commission to the owner's pending withdrawals.
    *           Ethers to withdraw has to be greater that 0, otherwise transaction
    *           will be rejected.
    *           Can be called only by the owner.
    */
    function addCommissionToPendingWithdrawals(uint32 _canvasId)
    public
    onlyOwner
    stateOwned(_canvasId)
    forceOwned(_canvasId) {
        FeeHistory storage _history = _getFeeHistory(_canvasId);
        uint _toWithdraw = calculateCommissionToWithdraw(_canvasId);
        uint _lastIndex = _history.commissionCumulative.length - 1;
        require(_toWithdraw > 0);

        _history.paidCommissionIndex = _lastIndex;
        addPendingWithdrawal(owner, _toWithdraw);

        emit CommissionAddedToWithdrawals(_canvasId, _toWithdraw);
    }

    /**
    * @notice   Adds all unpaid rewards of the caller to his pending withdrawals.
    *           Ethers to withdraw has to be greater that 0, otherwise transaction
    *           will be rejected.
    */
    function addRewardToPendingWithdrawals(uint32 _canvasId)
    public
    stateOwned(_canvasId)
    forceOwned(_canvasId) {
        FeeHistory storage _history = _getFeeHistory(_canvasId);
        uint _toWithdraw;
        (_toWithdraw,) = calculateRewardToWithdraw(_canvasId, msg.sender);
        uint _lastIndex = _history.rewardsCumulative.length - 1;
        require(_toWithdraw > 0);

        _history.addressToPaidRewardIndex[msg.sender] = _lastIndex;
        addPendingWithdrawal(msg.sender, _toWithdraw);

        emit RewardAddedToWithdrawals(_canvasId, msg.sender, _toWithdraw);
    }

    /**
    * @notice   Calculates how much of commission there is to be paid.
    */
    function calculateCommissionToWithdraw(uint32 _canvasId)
    public
    view
    stateOwned(_canvasId)
    returns (uint)
    {
        FeeHistory storage _history = _getFeeHistory(_canvasId);
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

    /**
    * @notice   Calculates unpaid rewards of a given address. Returns amount to withdraw
    *           and amount of pixels owned.
    */
    function calculateRewardToWithdraw(uint32 _canvasId, address _address)
    public
    view
    stateOwned(_canvasId)
    returns (
        uint reward,
        uint pixelsOwned
    )
    {
        FeeHistory storage _history = _getFeeHistory(_canvasId);
        uint _lastIndex = _history.rewardsCumulative.length - 1;
        uint _lastPaidIndex = _history.addressToPaidRewardIndex[_address];
        uint _pixelsOwned = getPaintedPixelsCountByAddress(_address, _canvasId);

        if (_lastIndex < 0) {
            //means that FeeHistory hasn't been created yet
            return (0, _pixelsOwned);
        }

        uint _rewardsSum = _history.rewardsCumulative[_lastIndex];
        uint _lastWithdrawn = _history.rewardsCumulative[_lastPaidIndex];

        // Our data structure guarantees that _commissionSum is greater or equal to _lastWithdrawn
        uint _toWithdraw = ((_rewardsSum - _lastWithdrawn) / PIXEL_COUNT) * _pixelsOwned;

        return (_toWithdraw, _pixelsOwned);
    }

    /**
    * @notice   Returns total amount of commission charged for a given canvas.
    *           It is not a commission to be withdrawn!
    */
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

    /**
    * @notice   Returns total amount of commission that has been already
    *           paid (added to pending withdrawals).
    */
    function getCommissionWithdrawn(uint32 _canvasId) external view returns (uint) {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _index = _history.paidCommissionIndex;

        return _history.commissionCumulative[_index];
    }

    /**
    * @notice   Returns all rewards charged for the given canvas.
    */
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
    * @notice   Returns total amount of rewards that has been already
    *           paid (added to pending withdrawals) by a given address.
    */
    function getRewardsWithdrawn(uint32 _canvasId, address _address) external view returns (uint) {
        require(_canvasId < canvases.length);
        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
        uint _index = _history.addressToPaidRewardIndex[_address];
        uint _pixelsOwned = getPaintedPixelsCountByAddress(_address, _canvasId);

        if (_history.rewardsCumulative.length == 0 || _index == 0) {
            return 0;
        }

        return (_history.rewardsCumulative[_index] / PIXEL_COUNT) * _pixelsOwned;
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

        FeeHistory storage _history = _getFeeHistory(_canvasId);
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

        FeeHistory storage _history = _getFeeHistory(_canvasId);
        _pushCumulative(_history.commissionCumulative, _commission);
        _pushCumulative(_history.rewardsCumulative, _rewards);

        return (_commission, _rewards, _sellerProfit);
    }

    function _onCanvasCreated(uint32 _canvasId) internal {
        //we create a fee entrance on the moment canvas is created
        canvasToFeeHistory[_canvasId] = FeeHistory(new uint[](1), new uint[](1), 0);
    }

    /**
    * @notice   Gets a fee history of a canvas.
    */
    function _getFeeHistory(uint32 _canvasId) private view returns (FeeHistory storage) {
        require(_canvasId < canvases.length);
        //fee history entry is created in onCanvasCreated() method.

        FeeHistory storage _history = canvasToFeeHistory[_canvasId];
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

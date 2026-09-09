// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PlotLockMarket
/// @notice Minimal spoilerless IP prediction market contract for the PlotLock demo.
/// @dev The selected option is intentionally NOT stored on-chain. Store only a
/// commitment hash and a CDR vault reference hash to prevent live odds and
/// spoiler-sensitive metadata from leaking through public storage/events.
contract PlotLockMarket {
    enum Status {
        Open,
        Closed,
        Resolved
    }

    struct Market {
        address creator;
        bytes32 ipAssetIdHash;
        bytes32 optionsHash;
        string question;
        uint256 deadline;
        uint256 participantCount;
        Status status;
        bytes32 outcomeVaultHash;
    }

    struct Submission {
        bytes32 commitmentHash;
        bytes32 predictionVaultHash;
        uint256 stake;
        bool exists;
    }

    uint256 public nextMarketId = 1;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Submission)) public submissions;

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        bytes32 indexed ipAssetIdHash,
        bytes32 optionsHash,
        uint256 deadline
    );

    event PredictionCommitted(
        uint256 indexed marketId,
        address indexed fan,
        bytes32 commitmentHash,
        bytes32 predictionVaultHash,
        uint256 stake
    );

    event MarketClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, bytes32 outcomeVaultHash);

    error NotCreator();
    error NotOpen();
    error AlreadySubmitted();
    error DeadlineNotReached();
    error InvalidMarket();

    function createMarket(
        bytes32 ipAssetIdHash,
        bytes32 optionsHash,
        string calldata question,
        uint256 deadline
    ) external returns (uint256 marketId) {
        marketId = nextMarketId++;
        markets[marketId] = Market({
            creator: msg.sender,
            ipAssetIdHash: ipAssetIdHash,
            optionsHash: optionsHash,
            question: question,
            deadline: deadline,
            participantCount: 0,
            status: Status.Open,
            outcomeVaultHash: bytes32(0)
        });

        emit MarketCreated(marketId, msg.sender, ipAssetIdHash, optionsHash, deadline);
    }

    function submitPrediction(
        uint256 marketId,
        bytes32 commitmentHash,
        bytes32 predictionVaultHash
    ) external payable {
        Market storage market = markets[marketId];
        if (market.creator == address(0)) revert InvalidMarket();
        if (market.status != Status.Open || block.timestamp >= market.deadline) revert NotOpen();
        if (submissions[marketId][msg.sender].exists) revert AlreadySubmitted();

        submissions[marketId][msg.sender] = Submission({
            commitmentHash: commitmentHash,
            predictionVaultHash: predictionVaultHash,
            stake: msg.value,
            exists: true
        });
        market.participantCount += 1;

        emit PredictionCommitted(marketId, msg.sender, commitmentHash, predictionVaultHash, msg.value);
    }

    function closeMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        if (market.creator == address(0)) revert InvalidMarket();
        if (market.creator != msg.sender) revert NotCreator();
        if (market.status != Status.Open) revert NotOpen();

        market.status = Status.Closed;
        emit MarketClosed(marketId);
    }

    function resolveMarket(uint256 marketId, bytes32 outcomeVaultHash) external {
        Market storage market = markets[marketId];
        if (market.creator == address(0)) revert InvalidMarket();
        if (market.creator != msg.sender) revert NotCreator();
        if (market.status != Status.Closed) revert NotOpen();

        market.outcomeVaultHash = outcomeVaultHash;
        market.status = Status.Resolved;
        emit MarketResolved(marketId, outcomeVaultHash);
    }
}

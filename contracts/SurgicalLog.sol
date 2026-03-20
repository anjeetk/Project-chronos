// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SurgicalLog
 * @notice Anchors Merkle roots of surgical recording hash chains on-chain.
 *         Only emits an event (no storage needed for demo — logs are enough).
 */
contract SurgicalLog {
    event RootStored(bytes32 indexed root, uint256 ts);

    /**
     * @notice Store a Merkle root on-chain.
     * @param root The 32-byte Merkle root hash.
     */
    function storeRoot(bytes32 root) external {
        emit RootStored(root, block.timestamp);
    }
}

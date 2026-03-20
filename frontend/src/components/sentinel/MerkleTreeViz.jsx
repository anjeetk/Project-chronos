/**
 * MerkleTreeViz.jsx — Visual Merkle tree component.
 *
 * Shows: leaf hashes → intermediate → root → blockchain anchor
 * Animated tree building as records batch.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Link2 } from 'lucide-react';

export default function MerkleTreeViz({ auditTrail = [], batches = [] }) {
  const [displayBatch, setDisplayBatch] = useState(null);

  // Build a mini tree from the latest batch or last 8 hashes
  useEffect(() => {
    if (batches.length > 0) {
      setDisplayBatch(batches[batches.length - 1]);
    }
  }, [batches]);

  // Get last 8 hashes for visualization
  const recentHashes = auditTrail.slice(-8).map((r) => r.chain_hash || r.hash);

  function buildTreeLevels(leaves) {
    if (leaves.length === 0) return [];
    const levels = [leaves];
    let current = leaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const a = current[i];
        const b = i + 1 < current.length ? current[i + 1] : a;
        next.push(hashPair(a, b));
      }
      levels.push(next);
      current = next;
    }
    return levels;
  }

  function hashPair(a, b) {
    // Visual mock — just combine first chars
    return (a.slice(0, 4) + b.slice(0, 4)).padEnd(8, '0');
  }

  const treeLevels = buildTreeLevels(recentHashes.map((h) => h?.slice(0, 8) || '--------'));
  const root = treeLevels.length > 0 ? treeLevels[treeLevels.length - 1][0] : '--------';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <GitBranch size={16} style={{ color: 'var(--accent)' }} />
        <span style={styles.title}>Merkle Tree</span>
        {displayBatch && (
          <span style={styles.badge}>
            Batch #{batches.length}
          </span>
        )}
      </div>

      {/* Tree visualization */}
      <div style={styles.treeWrap}>
        {treeLevels.map((level, li) => (
          <motion.div
            key={li}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: li * 0.15 }}
            style={{
              ...styles.row,
              justifyContent: level.length === 1 ? 'center' : 'space-around',
            }}
          >
            {level.map((hash, hi) => (
              <div
                key={hi}
                style={{
                  ...styles.node,
                  ...(li === treeLevels.length - 1 ? styles.rootNode : {}),
                  ...(li === 0 ? styles.leafNode : {}),
                }}
              >
                <code style={styles.hashText}>{hash}</code>
              </div>
            ))}
          </motion.div>
        ))}

        {/* Connectors (drawn between rows) */}
        {treeLevels.length > 1 &&
          treeLevels.slice(0, -1).map((_, li) => (
            <div key={`conn-${li}`} style={styles.connectorRow}>
              {Array.from({ length: Math.ceil(treeLevels[li].length / 2) }).map((_, ci) => (
                <div key={ci} style={styles.connector}>
                  <div style={styles.connLine}></div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Blockchain anchor */}
      <div style={styles.anchorRow}>
        <div style={styles.anchorLine}></div>
        <div style={styles.anchorBox}>
          <Link2 size={12} />
          <span style={styles.anchorLabel}>Blockchain Anchor</span>
          <code style={styles.anchorHash}>
            {displayBatch
              ? displayBatch.tx_hash?.slice(0, 20) + '...'
              : '0xMOCK_awaiting...'}
          </code>
        </div>
      </div>

      {/* Batch info */}
      {displayBatch && (
        <div style={styles.batchInfo}>
          <span>Seq {displayBatch.start_seq}–{displayBatch.end_seq}</span>
          <span>Root: {displayBatch.root?.slice(0, 16)}...</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'var(--bg-card)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
  },
  treeWrap: {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: 4,
    padding: '8px 0',
    position: 'relative',
  },
  row: {
    display: 'flex',
    gap: 6,
    justifyContent: 'space-around',
  },
  node: {
    padding: '4px 8px',
    borderRadius: 6,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
  },
  rootNode: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  leafNode: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  hashText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'var(--text-secondary)',
  },
  connectorRow: {
    display: 'flex',
    justifyContent: 'space-around',
    height: 8,
  },
  connector: {
    display: 'flex',
    justifyContent: 'center',
  },
  connLine: {
    width: 1,
    height: '100%',
    background: 'var(--border)',
  },
  anchorRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  anchorLine: {
    width: 1,
    height: 12,
    background: 'var(--border)',
  },
  anchorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#f59e0b',
    fontSize: 11,
  },
  anchorLabel: {
    fontWeight: 600,
  },
  anchorHash: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
  batchInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    fontFamily: 'monospace',
    color: 'var(--text-secondary)',
    padding: '4px 0',
  },
};

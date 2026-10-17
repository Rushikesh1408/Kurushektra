import React, { useState } from 'react'
import {
  BookOpen,
  Search,
  FileText,
  CheckCircle,
  Database,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react'
import { searchKnowledge } from '../services/api'

interface SearchResult {
  doc_id: string
  title: string
  chunk_text: string
  score: number
  subject?: string
}

const DEFAULT_DOCUMENTS = [
  {
    doc_id: 'doc-algo-01',
    title: 'Introduction to Algorithms — Dynamic Programming & Memoization',
    chunk_text: 'Dynamic programming is an algorithmic paradigm that solves a given complex problem by breaking it into subproblems and storing the results of subproblems to avoid recomputing them. The two essential properties are: 1. Optimal Substructure: An optimal solution contains optimal solutions to subproblems. 2. Overlapping Subproblems: The same subproblems are solved multiple times.',
    score: 0.94,
    subject: 'Algorithms'
  },
  {
    doc_id: 'doc-search-02',
    title: 'Binary Search Invariants & Boundary Handling',
    chunk_text: 'When implementing binary search, three boundary conditions must be kept synchronized: the search range condition (while low <= high), the pivot adjustment (low = mid + 1, high = mid - 1), and mid computation (mid = low + (high - low) // 2) to prevent arithmetic integer overflow.',
    score: 0.89,
    subject: 'Data Structures'
  },
  {
    doc_id: 'doc-hash-01',
    title: 'Hash Tables: Collision Resolution Strategies',
    chunk_text: 'Hash tables provide expected O(1) time complexity for insert, search, and delete operations. When two distinct keys hash to the same bucket index, collisions are resolved via Separate Chaining (linked lists or balanced trees per bucket) or Open Addressing (Linear Probing, Quadratic Probing, Double Hashing).',
    score: 0.85,
    subject: 'Data Structures'
  },
  {
    doc_id: 'doc-graph-03',
    title: 'Graph Traversal & Shortest Path: Dijkstra vs Bellman-Ford',
    chunk_text: 'Dijkstra’s algorithm greedily extracts the vertex with minimum tentative distance from a priority queue in O((V + E) log V) time. However, Dijkstra assumes all edge weights are non-negative. For graphs with negative edge weights, the Bellman-Ford algorithm in O(V * E) must be used.',
    score: 0.81,
    subject: 'Algorithms'
  }
]

export const KnowledgePage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>(DEFAULT_DOCUMENTS)
  const [loading, setLoading] = useState(false)
  const [topK, setTopK] = useState(4)

  const handleSearch = async () => {
    if (!query.trim() || loading) return
    setLoading(true)

    try {
      const res = await searchKnowledge(query, topK)
      if (res.data.results && res.data.results.length > 0) {
        setResults(
          res.data.results.map((r) => ({
            doc_id: r.doc_id,
            title: r.title,
            chunk_text: r.chunk_text,
            score: r.score,
            subject: 'Curriculum Core'
          }))
        )
      } else {
        // Filter locally
        filterLocal(query)
      }
    } catch {
      filterLocal(query)
    } finally {
      setLoading(false)
    }
  }

  const filterLocal = (q: string) => {
    const qLower = q.toLowerCase()
    const filtered = DEFAULT_DOCUMENTS.filter(
      (d) =>
        d.title.toLowerCase().includes(qLower) ||
        d.chunk_text.toLowerCase().includes(qLower) ||
        d.subject.toLowerCase().includes(qLower)
    )
    setResults(filtered.length > 0 ? filtered : DEFAULT_DOCUMENTS)
  }

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={26} color="var(--color-accent-light)" /> Knowledge Base &amp; RAG Vector Index
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Explore educational materials and textbooks vectorized in ChromaDB / Qdrant for semantic retrieval.
        </p>
      </div>

      {/* Search Bar & Filters Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search
              size={18}
              color="var(--color-text-muted)"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search concepts (e.g. 'binary search invariants', 'dynamic programming memoization', 'hash tables')..."
              className="form-input"
              style={{ paddingLeft: '42px', paddingRight: '14px', height: '46px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Top-K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="form-select"
              style={{ width: 'auto', height: '46px' }}
            >
              <option value={3}>3 Chunks</option>
              <option value={5}>5 Chunks</option>
              <option value={8}>8 Chunks</option>
            </select>

            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="btn btn-primary"
              style={{ height: '46px', padding: '0 24px' }}
            >
              {loading ? <Sparkles size={16} className="spin" /> : <Search size={16} />}
              Search Vectors
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} color="var(--color-accent-light)" /> Indexed Knowledge Chunks ({results.length})
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Vector Distance Metric: Cosine Similarity
        </span>
      </div>

      {/* Results Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {results.map((item, index) => (
          <div key={index} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)', borderRadius: 'var(--radius-sm)' }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {item.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    <span>Doc ID: {item.doc_id}</span>
                    {item.subject && <span>• Subject: {item.subject}</span>}
                  </div>
                </div>
              </div>

              {/* Relevance Score Pill */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                  {(item.score * 100).toFixed(1)}% Relevance
                </span>
                <div style={{ width: '80px', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.score * 100}%`,
                      height: '100%',
                      background: 'var(--color-success)',
                    }}
                  />
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              {item.chunk_text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

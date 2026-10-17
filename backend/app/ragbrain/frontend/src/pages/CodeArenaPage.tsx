import React, { useState } from 'react'
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Clock,
  Sparkles,
  Shield,
  Layers
} from 'lucide-react'
import { submitCode } from '../services/api'
import { SubmissionResponse, TestCaseResult } from '../types'

interface AssignmentOption {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  language: string
  description: string
  starterCode: string
}

const SAMPLE_ASSIGNMENTS: AssignmentOption[] = [
  {
    id: 'assign-two-sum-01',
    title: 'Two Sum with Optimal Hash Map',
    difficulty: 'Easy',
    language: 'python',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Aim for O(n) time complexity.`,
    starterCode: `def two_sum(nums, target):
    # Complete this function using a dictionary / hash map
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test execution wrapper
import json, sys
if __name__ == '__main__':
    data = json.loads(sys.stdin.read().strip())
    print(json.dumps(two_sum(data['nums'], data['target'])))
`
  },
  {
    id: 'assign-binary-search-02',
    title: 'Binary Search Boundary Invariant',
    difficulty: 'Medium',
    language: 'python',
    description: `Implement binary search to find the index of \`target\` in a sorted array \`nums\`. If target exists, return its index; otherwise, return -1.\n\nBe mindful of loop boundary conditions (\`low <= high\`) to avoid off-by-one errors.`,
    starterCode: `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
            
    return -1

import json, sys
if __name__ == '__main__':
    data = json.loads(sys.stdin.read().strip())
    print(binary_search(data['nums'], data['target']))
`
  },
  {
    id: 'assign-valid-parens-03',
    title: 'Valid Parentheses Stack Evaluation',
    difficulty: 'Easy',
    language: 'python',
    description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nOpen brackets must be closed by the same type of brackets in the correct order.`,
    starterCode: `def is_valid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
            
    return not stack

import sys
if __name__ == '__main__':
    s = sys.stdin.read().strip()
    print("true" if is_valid(s) else "false")
`
  }
]

export const CodeArenaPage: React.FC = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentOption>(SAMPLE_ASSIGNMENTS[0])
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_ASSIGNMENTS[0].starterCode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResponse | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const handleSelectAssignment = (assign: AssignmentOption) => {
    setSelectedAssignment(assign)
    setSourceCode(assign.starterCode)
    setResult(null)
    setSubmissionError(null)
  }

  const handleReset = () => {
    setSourceCode(selectedAssignment.starterCode)
    setResult(null)
    setSubmissionError(null)
  }

  const handleSubmit = async () => {
    if (!sourceCode.trim() || isSubmitting) return
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      const response = await submitCode(
        selectedAssignment.id,
        selectedAssignment.language,
        sourceCode
      )
      setResult(response.data)
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Execution service or backend is unreachable'
      setSubmissionError(String(detail))
      setResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Code2 size={26} color="var(--color-accent-light)" /> Code Arena &amp; Sandboxed Evaluator
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Deterministic grading via Judge0 with mistake memory diagnosis and hidden test case isolation.
          </p>
        </div>

        {/* Problem Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Problem:</span>
          <select
            value={selectedAssignment.id}
            onChange={(e) => {
              const found = SAMPLE_ASSIGNMENTS.find((a) => a.id === e.target.value)
              if (found) handleSelectAssignment(found)
            }}
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
          >
            {SAMPLE_ASSIGNMENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.difficulty})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Problem Spec & Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Problem Spec Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{selectedAssignment.title}</h2>
              <span
                className={`badge ${
                  selectedAssignment.difficulty === 'Easy'
                    ? 'badge-success'
                    : selectedAssignment.difficulty === 'Medium'
                    ? 'badge-warning'
                    : 'badge-error'
                }`}
              >
                {selectedAssignment.difficulty}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {selectedAssignment.description}
            </p>
          </div>

          {/* Code Editor */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-accent-light)' }}>Language:</span>
                <span style={{ textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>
                  {selectedAssignment.language}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
                title="Reset to starter template"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              spellCheck={false}
              className="form-textarea"
              style={{
                height: '380px',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                lineHeight: 1.5,
                background: '#0d0e14',
                color: '#e2e8f0',
                border: 'none',
                borderRadius: '0',
                outline: 'none',
                resize: 'none'
              }}
            />

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}
            >
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !sourceCode.trim()}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="spin" /> Executing in Sandbox...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Submit &amp; Evaluate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Execution & Evaluation Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {submissionError && (
            <div
              className="card"
              style={{
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} color="var(--color-error)" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-error)' }}>
                    Submission Execution Failure
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Sandbox Execution / Network Error
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {submissionError}
              </p>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg-elevated)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Shield size={16} color="var(--color-accent-light)" />
                <span>
                  <strong>Sandbox Isolation:</strong> Untrusted code was not executed on the host. No points or false grading were recorded.
                </span>
              </div>
            </div>
          )}

          {result ? (
            <>
              {/* Score Summary Card */}
              <div
                className="card"
                style={{
                  padding: '24px',
                  background:
                    result.is_infrastructure_failure
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(17, 18, 24, 0.8) 100%)'
                      : result.score_fraction === 1
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(17, 18, 24, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 18, 24, 0.8) 100%)',
                  borderColor:
                    result.is_infrastructure_failure
                      ? 'rgba(245, 158, 11, 0.4)'
                      : result.score_fraction === 1
                      ? 'rgba(34, 197, 94, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {result.is_infrastructure_failure ? (
                      <AlertTriangle size={28} color="var(--color-warning)" />
                    ) : result.score_fraction === 1 ? (
                      <CheckCircle2 size={28} color="var(--color-success)" />
                    ) : (
                      <XCircle size={28} color="var(--color-error)" />
                    )}
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                        {result.is_infrastructure_failure
                          ? 'Infrastructure Failure'
                          : result.score_fraction === 1
                          ? 'Solution Accepted'
                          : 'Evaluation Incomplete'}
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Status: {result.status.toUpperCase()} • Deterministic Rubric
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: result.is_infrastructure_failure
                          ? 'var(--color-warning)'
                          : result.score_fraction === 1
                          ? 'var(--color-success)'
                          : 'var(--color-error)'
                      }}
                    >
                      {result.earned_points} / {result.total_points} pts
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {result.tests_passed} of {result.tests_total} tests passed
                    </div>
                  </div>
                </div>

                {result.is_infrastructure_failure && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      marginBottom: '14px'
                    }}
                  >
                    <strong>Notice:</strong> An execution infrastructure error occurred during sandbox evaluation. This run was not graded as a failure and does not affect your student mastery score.
                  </div>
                )}

                <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '14px', lineHeight: 1.6 }}>
                  {result.feedback_summary}
                </p>

                {/* Mistake Diagnosis & Hint */}
                {result.hint && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginTop: '12px'
                    }}
                  >
                    <Lightbulb size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase' }}>
                        Pedagogical Hint {result.error_category ? `(${result.error_category})` : ''}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                        {result.hint}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Cases Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--color-accent-light)" /> Test Case Execution Breakdown
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.test_results?.map((tc, idx) => (
                    <div
                      key={tc.test_case_id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {tc.passed ? (
                          <CheckCircle2 size={16} color="var(--color-success)" />
                        ) : (
                          <XCircle size={16} color="var(--color-error)" />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>
                            Test Case #{idx + 1}{' '}
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                              ({tc.is_public ? 'Public Test' : 'Hidden Test — Isolated'})
                            </span>
                          </div>
                          {tc.actual_output_preview && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              Output: {tc.actual_output_preview}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${tc.passed ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '11px' }}>
                          {tc.status_description}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {tc.time_seconds ? `${(tc.time_seconds * 1000).toFixed(0)}ms` : ''} • {tc.points_earned}/{tc.points_available} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grounded References */}
              {result.sources && result.sources.length > 0 && (
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-info)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    <BookOpen size={15} /> Recommended Curriculum Readings for this Topic
                  </div>
                  {result.sources.map((s, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '4px 0' }}>
                      • {s.doc_title} (Chunk #{s.chunk_index}) — {Math.round(s.relevance_score * 100)}% match
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : !submissionError ? (
            /* Empty placeholder state */
            <div
              className="card"
              style={{
                height: '480px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px',
                color: 'var(--color-text-secondary)'
              }}
            >
              <Shield size={48} color="var(--color-text-muted)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Ready to Evaluate Code
              </h3>
              <p style={{ maxWidth: '340px', fontSize: '13px', lineHeight: 1.5 }}>
                Write or modify your solution on the left, then click <strong>Submit &amp; Evaluate</strong> to run test cases through the isolated sandbox.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

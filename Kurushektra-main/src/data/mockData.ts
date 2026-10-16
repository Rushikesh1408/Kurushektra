import type {
  Challenge, Submission, FollowUpQuestion, MasteryItem,
  LearningGap, PracticeActivity, LearnerReport, TeacherReview,
  AdminUser, PlatformConfig, User
} from '../types';

// ── Current User ─────────────────────────────────────────────────────────
export const mockUser: User = {
  id: 'u1',
  name: 'Alex Chen',
  email: 'alex@example.com',
  role: 'learner',
  joinedAt: '2026-08-01T00:00:00Z',
};

export const mockTeacher: User = {
  id: 'u2',
  name: 'Dr. Sarah Kim',
  email: 'sarah@example.com',
  role: 'teacher',
  joinedAt: '2026-01-01T00:00:00Z',
};

export const mockAdmin: User = {
  id: 'u3',
  name: 'System Admin',
  email: 'admin@example.com',
  role: 'admin',
  joinedAt: '2025-06-01T00:00:00Z',
};

// ── Challenges ────────────────────────────────────────────────────────────
export const mockChallenges: Challenge[] = [
  {
    id: 'c1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    tags: ['hash-map', 'array', 'linear-scan'],
    acceptanceRate: 88.4,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume each input has exactly one solution and you may not use the same element twice.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      { input: 'nums = [3,3], target = 6', output: '[0,1]' },
    ],
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', '-10⁹ ≤ target ≤ 10⁹', 'Only one valid answer exists.'],
    starterCode: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:\n    seen = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in seen:\n            return [seen[complement], i]\n        seen[n] = i\n    return []`,
      javascript: `var twoSum = function(nums, target) {\n    const seen = {};\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (complement in seen) return [seen[complement], i];\n        seen[nums[i]] = i;\n    }\n};`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer,Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) return new int[]{seen.get(complement), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
    },
  },
  {
    id: 'c2',
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'easy',
    tags: ['binary-search', 'array', 'pointers'],
    acceptanceRate: 76.2,
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    description:
      'Given an array of integers `nums` sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1.',
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 exists at index 4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 does not exist' },
    ],
    constraints: ['1 ≤ nums.length ≤ 10⁴', '-10⁴ < nums[i], target < 10⁴', 'All integers in nums are unique.', 'nums is sorted in ascending order.'],
    starterCode: {
      python: `def search(nums: list[int], target: int) -> int:\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
      javascript: `var search = function(nums, target) {\n    let left = 0, right = nums.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) return mid;\n        else if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n};`,
      java: `class Solution {\n    public int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            else if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n}`,
    },
  },
  {
    id: 'c3',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    tags: ['stack', 'string'],
    acceptanceRate: 69.8,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description:
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: ['1 ≤ s.length ≤ 10⁴', 's consists of parentheses only.'],
    starterCode: {
      python: `def is_valid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            if not stack or stack[-1] != mapping[char]:\n                return False\n            stack.pop()\n        else:\n            stack.append(char)\n    return not stack`,
      javascript: `var isValid = function(s) {\n    const stack = [];\n    const map = {')':'(','}':'{',']':'['};\n    for (const c of s) {\n        if (map[c]) { if (stack.pop() !== map[c]) return false; }\n        else stack.push(c);\n    }\n    return stack.length === 0;\n};`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        Deque<Character> stack = new ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(' || c == '{' || c == '[') stack.push(c);\n            else if (stack.isEmpty() || \n                (c == ')' && stack.peek() != '(') ||\n                (c == '}' && stack.peek() != '{') ||\n                (c == ']' && stack.peek() != '[')) return false;\n            else stack.pop();\n        }\n        return stack.isEmpty();\n    }\n}`,
    },
  },
  {
    id: 'c4',
    slug: 'palindrome-check',
    title: 'Palindrome Checker',
    difficulty: 'easy',
    tags: ['string', 'two-pointers'],
    acceptanceRate: 82.1,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description:
      'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: 'amanaplanacanalpanama is a palindrome' },
      { input: 's = "race a car"', output: 'false' },
    ],
    constraints: ['1 ≤ s.length ≤ 2 * 10⁵', 's consists only of printable ASCII characters.'],
    starterCode: {
      python: `def is_palindrome(s: str) -> bool:\n    s = ''.join(c.lower() for c in s if c.isalnum())\n    return s == s[::-1]`,
      javascript: `var isPalindrome = function(s) {\n    s = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n    return s === s.split('').reverse().join('');\n};`,
      java: `class Solution {\n    public boolean isPalindrome(String s) {\n        s = s.toLowerCase().replaceAll("[^a-z0-9]", "");\n        int l = 0, r = s.length() - 1;\n        while (l < r) { if (s.charAt(l++) != s.charAt(r--)) return false; }\n        return true;\n    }\n}`,
    },
  },
  {
    id: 'c5',
    slug: 'find-maximum-element',
    title: 'Find Maximum Element',
    difficulty: 'easy',
    tags: ['array', 'linear-scan'],
    acceptanceRate: 91.3,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'Given an integer array `nums`, return the largest element in the array.',
    examples: [
      { input: 'nums = [3,2,1,5,6,4]', output: '6' },
      { input: 'nums = [3,2,3,1,2,4,5,5,6]', output: '6' },
    ],
    constraints: ['1 ≤ nums.length ≤ 10⁴', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    starterCode: {
      python: `def find_max(nums: list[int]) -> int:\n    return max(nums)`,
      javascript: `var findMax = function(nums) { return Math.max(...nums); };`,
      java: `class Solution { public int findMax(int[] nums) { int max = nums[0]; for (int n : nums) if (n > max) max = n; return max; } }`,
    },
  },
  {
    id: 'c6',
    slug: 'merge-sorted-arrays',
    title: 'Merge Sorted Arrays',
    difficulty: 'medium',
    tags: ['array', 'two-pointers', 'sorting'],
    acceptanceRate: 54.7,
    timeComplexity: 'O(m+n)',
    spaceComplexity: 'O(1)',
    description: 'You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order. Merge them into a single sorted array.',
    examples: [
      { input: 'nums1 = [1,2,3,0,0,0], m=3, nums2 = [2,5,6], n=3', output: '[1,2,2,3,5,6]' },
    ],
    constraints: ['nums1.length == m + n', 'nums2.length == n', '0 ≤ m, n ≤ 200'],
    starterCode: {
      python: `def merge(nums1, m, nums2, n):\n    i, j, k = m - 1, n - 1, m + n - 1\n    while i >= 0 and j >= 0:\n        if nums1[i] > nums2[j]:\n            nums1[k] = nums1[i]; i -= 1\n        else:\n            nums1[k] = nums2[j]; j -= 1\n        k -= 1\n    while j >= 0:\n        nums1[k] = nums2[j]; j -= 1; k -= 1`,
      javascript: `var merge = function(nums1, m, nums2, n) {\n    let i = m-1, j = n-1, k = m+n-1;\n    while (i>=0 && j>=0) nums1[k--] = nums1[i]>nums2[j] ? nums1[i--] : nums2[j--];\n    while (j>=0) nums1[k--] = nums2[j--];\n};`,
      java: `class Solution { public void merge(int[] n1,int m,int[] n2,int n){int i=m-1,j=n-1,k=m+n-1;while(i>=0&&j>=0)n1[k--]=n1[i]>n2[j]?n1[i--]:n2[j--];while(j>=0)n1[k--]=n2[j--];} }`,
    },
  },
  {
    id: 'c7',
    slug: 'longest-common-prefix',
    title: 'Longest Common Prefix',
    difficulty: 'easy',
    tags: ['string', 'trie'],
    acceptanceRate: 73.5,
    timeComplexity: 'O(S)',
    spaceComplexity: 'O(1)',
    description: 'Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string "".',
    examples: [
      { input: 'strs = ["flower","flow","flight"]', output: '"fl"' },
      { input: 'strs = ["dog","racecar","car"]', output: '""', explanation: 'No common prefix' },
    ],
    constraints: ['1 ≤ strs.length ≤ 200', '0 ≤ strs[i].length ≤ 200'],
    starterCode: {
      python: `def longest_common_prefix(strs):\n    if not strs: return ""\n    prefix = strs[0]\n    for s in strs[1:]:\n        while not s.startswith(prefix):\n            prefix = prefix[:-1]\n    return prefix`,
      javascript: `var longestCommonPrefix = function(strs) {\n    if (!strs.length) return "";\n    let prefix = strs[0];\n    for (const s of strs.slice(1)) while (!s.startsWith(prefix)) prefix = prefix.slice(0,-1);\n    return prefix;\n};`,
      java: `class Solution { public String longestCommonPrefix(String[] s) { if(s.length==0)return""; String p=s[0]; for(String t:s) while(!t.startsWith(p)) p=p.substring(0,p.length()-1); return p; } }`,
    },
  },
  {
    id: 'c8',
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    tags: ['dynamic-programming', 'memoization', 'fibonacci'],
    acceptanceRate: 78.9,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. How many distinct ways can you climb to the top?',
    examples: [
      { input: 'n = 2', output: '2', explanation: '1 step + 1 step, or 2 steps' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1' },
    ],
    constraints: ['1 ≤ n ≤ 45'],
    starterCode: {
      python: `def climb_stairs(n: int) -> int:\n    a, b = 1, 1\n    for _ in range(n - 1):\n        a, b = b, a + b\n    return b`,
      javascript: `var climbStairs = function(n) {\n    let [a, b] = [1, 1];\n    for (let i = 1; i < n; i++) [a, b] = [b, a + b];\n    return b;\n};`,
      java: `class Solution { public int climbStairs(int n) { int a=1,b=1; for(int i=1;i<n;i++){int t=b;b=a+b;a=t;} return b; } }`,
    },
  },
];

// ── Submissions ───────────────────────────────────────────────────────────
export const mockSubmissions: Submission[] = [
  {
    id: 's1', challengeId: 'c1', challengeTitle: 'Two Sum', userId: 'u1',
    language: 'python', code: 'def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target-n in seen: return [seen[target-n],i]\n        seen[n]=i',
    status: 'accepted', isSimulated: true, testsPassed: 57, testsTotal: 57,
    runtime: 48, memory: 15.2, submittedAt: '2026-10-16T10:30:00Z',
    output: 'All 57 test cases passed.',
  },
  {
    id: 's2', challengeId: 'c2', challengeTitle: 'Binary Search', userId: 'u1',
    language: 'python', code: 'def search(nums, target):\n    l,r=0,len(nums)-1\n    while l<=r:\n        mid=(l+r)//2\n        if nums[mid]==target: return mid\n        elif nums[mid]<target: l=mid+1\n        else: r=mid-1\n    return -1',
    status: 'wrong_answer', isSimulated: true, testsPassed: 42, testsTotal: 46,
    runtime: 35, memory: 14.8, submittedAt: '2026-10-15T14:20:00Z',
    errorMessage: 'Expected -1 when target not found but got index out of bounds on test 43.',
  },
  {
    id: 's3', challengeId: 'c3', challengeTitle: 'Valid Parentheses', userId: 'u1',
    language: 'javascript', code: "var isValid = s => { const st=[],m={')':'(','}':'{',']':'['}; for(const c of s){if(m[c]){if(st.pop()!==m[c])return false;}else st.push(c);} return !st.length; };",
    status: 'accepted', isSimulated: true, testsPassed: 92, testsTotal: 92,
    runtime: 62, memory: 42.1, submittedAt: '2026-10-14T09:15:00Z',
  },
  {
    id: 's4', challengeId: 'c4', challengeTitle: 'Palindrome Checker', userId: 'u1',
    language: 'python', code: "def isPalindrome(s):\n    s=''.join(c.lower() for c in s if c.isalnum())\n    return s==s[::-1]",
    status: 'accepted', isSimulated: true, testsPassed: 480, testsTotal: 480,
    runtime: 28, memory: 13.9, submittedAt: '2026-10-13T16:45:00Z',
  },
  {
    id: 's5', challengeId: 'c1', challengeTitle: 'Two Sum', userId: 'u1',
    language: 'python', code: 'def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1,len(nums)):\n            if nums[i]+nums[j]==target: return [i,j]',
    status: 'timeout', isSimulated: true, testsPassed: 55, testsTotal: 57,
    submittedAt: '2026-10-12T11:00:00Z',
    errorMessage: 'Time limit exceeded on test case 56 (n=10000). O(n²) solution is too slow.',
  },
];

// ── Follow-up Questions ───────────────────────────────────────────────────
export const mockFollowUps: FollowUpQuestion[] = [
  { id: 'fq1', submissionId: 's1', concept: 'Hash Maps', question: 'Why does using a hash map reduce the time complexity from O(n²) to O(n)?', answer: '', isCorrect: undefined },
  { id: 'fq2', submissionId: 's1', concept: 'Collision Handling', question: 'What happens when two different keys map to the same hash bucket? How does Python handle this?', answer: '', isCorrect: undefined },
  { id: 'fq3', submissionId: 's1', concept: 'Space Complexity', question: 'What is the worst-case space complexity of your solution and why?', answer: '', isCorrect: undefined },
  { id: 'fq4', submissionId: 's2', concept: 'Binary Search Invariants', question: 'In binary search, why do we use `left <= right` rather than `left < right` as the loop condition?', answer: 'Because when left equals right, we still have one element to check at the midpoint.', isCorrect: true },
];

// ── Mastery Items ─────────────────────────────────────────────────────────
export const mockMastery: MasteryItem[] = [
  { concept: 'Hash Maps & Direct Addressing', level: 'demonstrated', percentage: 92, lastAssessed: '2026-10-16T10:30:00Z', testsCompleted: 28, testsTotal: 30, confidence: 'high' },
  { concept: 'Two Pointers & Sliding Window', level: 'developing', percentage: 85, lastAssessed: '2026-10-15T14:00:00Z', testsCompleted: 19, testsTotal: 22, confidence: 'medium-high' },
  { concept: 'Binary Search Invariants', level: 'developing', percentage: 62, lastAssessed: '2026-10-15T14:20:00Z', testsCompleted: 13, testsTotal: 21, confidence: 'medium' },
  { concept: 'Stack & Queue Operations', level: 'demonstrated', percentage: 88, lastAssessed: '2026-10-14T09:15:00Z', testsCompleted: 22, testsTotal: 25, confidence: 'high' },
  { concept: 'Dynamic Programming (1D)', level: 'developing', percentage: 45, lastAssessed: '2026-10-10T08:00:00Z', testsCompleted: 9, testsTotal: 20, confidence: 'low' },
  { concept: 'Graph Traversal (BFS/DFS)', level: 'not_started', percentage: 0, lastAssessed: '', testsCompleted: 0, testsTotal: 20, confidence: 'low' },
  { concept: 'String Manipulation', level: 'mastered', percentage: 97, lastAssessed: '2026-10-13T16:45:00Z', testsCompleted: 30, testsTotal: 30, confidence: 'high' },
  { concept: 'Recursion & Backtracking', level: 'not_started', percentage: 12, lastAssessed: '2026-10-01T00:00:00Z', testsCompleted: 2, testsTotal: 18, confidence: 'low' },
];

// ── Learning Gaps ─────────────────────────────────────────────────────────
export const mockGaps: LearningGap[] = [
  {
    id: 'g1', concept: 'Binary Search Boundary Conditions', severity: 'high',
    description: 'Off-by-one errors when index bounds equal left == right. The mid-pointer rounding diverges on single-element slices.',
    relatedChallenges: ['c2'],
    resources: [
      { title: 'Binary Search: The Hard Way', type: 'article', url: '#' },
      { title: 'Visualizing Boundary Conditions', type: 'video', url: '#' },
      { title: 'Binary Search Drills', type: 'exercise', url: '#' },
    ],
  },
  {
    id: 'g2', concept: 'Dynamic Programming State Transitions', severity: 'medium',
    description: 'Struggle identifying optimal substructure in multi-dimensional DP problems.',
    relatedChallenges: ['c8'],
    resources: [
      { title: 'DP Patterns Catalog', type: 'article', url: '#' },
      { title: 'Thinking in State Machines', type: 'video', url: '#' },
    ],
  },
  {
    id: 'g3', concept: 'Hash Map Collision Mechanics', severity: 'low',
    description: 'Understanding amortized O(1) lookups under hash bucket collisions.',
    relatedChallenges: ['c1'],
    resources: [
      { title: 'Hash Tables Under the Hood', type: 'article', url: '#' },
    ],
  },
];

// ── Practice Activities ───────────────────────────────────────────────────
export const mockPractice: PracticeActivity[] = [
  {
    id: 'pa1', gapId: 'g1', concept: 'Binary Search Boundary Conditions',
    type: 'multiple_choice',
    prompt: 'Which termination condition is correct for a binary search that should return -1 if not found?',
    options: ['while (left < right)', 'while (left <= right)', 'while (left != right)', 'while (left < right - 1)'],
    correctAnswer: 'while (left <= right)',
    explanation: 'Using `left <= right` ensures we check the element when left and right converge to the same index.',
  },
  {
    id: 'pa2', gapId: 'g1', concept: 'Binary Search Boundary Conditions',
    type: 'code_completion',
    prompt: 'Complete the binary search: when `nums[mid] > target`, what should we do to `right`?',
    options: ['right = mid', 'right = mid - 1', 'right = mid + 1', 'right = left'],
    correctAnswer: 'right = mid - 1',
    explanation: 'We already checked mid and it was too large, so the answer must be to the left of mid. Setting right = mid - 1 excludes mid from the next search range.',
  },
  {
    id: 'pa3', gapId: 'g1', concept: 'Binary Search Boundary Conditions',
    type: 'multiple_choice',
    prompt: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
    correctAnswer: 'O(log n)',
    explanation: 'Each step halves the search space, resulting in O(log n) comparisons.',
  },
  {
    id: 'pa4', gapId: 'g2', concept: 'Dynamic Programming State Transitions',
    type: 'multiple_choice',
    prompt: 'In the Climbing Stairs problem, what does dp[i] represent?',
    options: ['The number of steps at position i', 'The number of ways to reach step i', 'The cost of reaching step i', 'The maximum jump from step i'],
    correctAnswer: 'The number of ways to reach step i',
    explanation: 'dp[i] = dp[i-1] + dp[i-2] because you can arrive at step i either from step i-1 or step i-2.',
  },
];

// ── Learner Report ────────────────────────────────────────────────────────
export const mockReport: LearnerReport = {
  userId: 'u1',
  totalSubmissions: 47,
  acceptedSubmissions: 31,
  challengesSolved: 8,
  masteryItems: mockMastery,
  recentActivity: [
    { date: '2026-10-10', count: 3 },
    { date: '2026-10-11', count: 1 },
    { date: '2026-10-12', count: 5 },
    { date: '2026-10-13', count: 4 },
    { date: '2026-10-14', count: 2 },
    { date: '2026-10-15', count: 6 },
    { date: '2026-10-16', count: 3 },
  ],
  streakDays: 7,
  rank: 142,
};

// ── Teacher Reviews ───────────────────────────────────────────────────────
export const mockReviews: TeacherReview[] = [
  { id: 'tr1', submissionId: 's1', learnerId: 'u1', learnerName: 'Alex Chen', challengeTitle: 'Two Sum', notes: 'Clean O(n) solution. Follow-up answers were incomplete — student understands the approach but cannot articulate the collision mechanics clearly.', flagged: false, reviewedAt: '2026-10-16T12:00:00Z' },
  { id: 'tr2', submissionId: 's5', learnerId: 'u1', learnerName: 'Alex Chen', challengeTitle: 'Two Sum (brute force)', notes: 'O(n²) nested loop rejected. Student submitted brute force first, indicating the hash map intuition may not be fully internalized.', flagged: true, reviewedAt: '2026-10-12T11:30:00Z' },
  { id: 'tr3', submissionId: 's2', learnerId: 'u1', learnerName: 'Alex Chen', challengeTitle: 'Binary Search', notes: 'Off-by-one error on boundary case. Remediation activity assigned.', flagged: false, reviewedAt: '2026-10-15T15:00:00Z' },
];

// ── Admin Users ───────────────────────────────────────────────────────────
export const mockAdminUsers: AdminUser[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex@example.com', role: 'learner', status: 'active', createdAt: '2026-08-01T00:00:00Z', lastLogin: '2026-10-16T10:30:00Z' },
  { id: 'u2', name: 'Dr. Sarah Kim', email: 'sarah@example.com', role: 'teacher', status: 'active', createdAt: '2026-01-01T00:00:00Z', lastLogin: '2026-10-16T09:00:00Z' },
  { id: 'u4', name: 'James Okafor', email: 'james@example.com', role: 'learner', status: 'active', createdAt: '2026-09-15T00:00:00Z', lastLogin: '2026-10-15T20:00:00Z' },
  { id: 'u5', name: 'Priya Patel', email: 'priya@example.com', role: 'learner', status: 'suspended', createdAt: '2026-07-20T00:00:00Z', lastLogin: '2026-10-01T00:00:00Z' },
  { id: 'u6', name: 'Lena Möller', email: 'lena@example.com', role: 'teacher', status: 'active', createdAt: '2026-02-10T00:00:00Z', lastLogin: '2026-10-14T08:00:00Z' },
  { id: 'u3', name: 'System Admin', email: 'admin@example.com', role: 'admin', status: 'active', createdAt: '2025-06-01T00:00:00Z', lastLogin: '2026-10-16T08:00:00Z' },
];

// ── Platform Config ───────────────────────────────────────────────────────
export const mockPlatformConfig: PlatformConfig = {
  executionService: { enabled: false, url: 'https://exec.congnicode.io/v1/run', timeout: 10 },
  assessmentEnabled: true,
  maxSubmissionsPerDay: 50,
  allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
  maintenanceMode: false,
};

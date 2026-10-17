from datetime import timedelta
import logging
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.adaptive import Concept, ConceptMastery, ConceptPrerequisite, RevisionSchedule
from app.models.base import Difficulty, RevisionStatus, as_aware, utcnow

logger = logging.getLogger("codearena.adaptive")


class CyclicPrerequisiteError(ValueError):
    """Raised when adding a prerequisite would introduce a cycle in the DAG."""


INITIAL_CONCEPTS = [
    {"slug": "variables", "name": "Variables & Types", "category": "fundamentals", "difficulty": Difficulty.EASY, "target_depth": 1,
     "description": "Declaration, assignment, primitive data types, and scope."},
    {"slug": "conditions", "name": "Conditionals & Logic", "category": "fundamentals", "difficulty": Difficulty.EASY, "target_depth": 1,
     "description": "Boolean expressions, if/else branching, and logical operators."},
    {"slug": "loops", "name": "Loops & Iteration", "category": "control_flow", "difficulty": Difficulty.MEDIUM, "target_depth": 2,
     "description": "While and for loops, iteration invariants, and loop bodies."},
    {"slug": "loop_boundaries", "name": "Loop Boundary Conditions", "category": "control_flow", "difficulty": Difficulty.MEDIUM, "target_depth": 2,
     "description": "Off-by-one errors, start/stop conditions, and inclusive/exclusive bounds."},
    {"slug": "functions", "name": "Functions & Modularization", "category": "fundamentals", "difficulty": Difficulty.MEDIUM, "target_depth": 2,
     "description": "Parameters, return values, call stack, and functional purity."},
    {"slug": "arrays", "name": "Arrays & Indexing", "category": "data_structures", "difficulty": Difficulty.MEDIUM, "target_depth": 2,
     "description": "0-based indexing, list manipulation, slicing, and traversal."},
    {"slug": "recursion", "name": "Recursion & Base Cases", "category": "algorithms", "difficulty": Difficulty.HARD, "target_depth": 3,
     "description": "Self-referential calls, base case termination, and recursion trees."},
    {"slug": "data_structures", "name": "Linear Data Structures", "category": "data_structures", "difficulty": Difficulty.HARD, "target_depth": 3,
     "description": "Stacks, queues, linked lists, and complexity trade-offs."},
]

PREREQUISITE_EDGES = [
    ("variables", "conditions"),
    ("conditions", "loops"),
    ("loops", "loop_boundaries"),
    ("loops", "arrays"),
    ("conditions", "functions"),
    ("functions", "recursion"),
    ("arrays", "data_structures"),
]


def seed_concept_taxonomy(db: Session) -> list[Concept]:
    """Seed initial concept taxonomy and prerequisite DAG."""
    concepts_by_slug = {}
    for data in INITIAL_CONCEPTS:
        c = db.scalar(select(Concept).where(Concept.slug == data["slug"]))
        if not c:
            c = Concept(**data)
            db.add(c)
            db.flush()
        concepts_by_slug[data["slug"]] = c

    for prereq_slug, target_slug in PREREQUISITE_EDGES:
        p_concept = concepts_by_slug.get(prereq_slug)
        t_concept = concepts_by_slug.get(target_slug)
        if p_concept and t_concept:
            exists = db.scalar(select(ConceptPrerequisite.id).where(
                ConceptPrerequisite.concept_id == t_concept.id,
                ConceptPrerequisite.prerequisite_id == p_concept.id,
            ))
            if not exists:
                db.add(ConceptPrerequisite(concept_id=t_concept.id, prerequisite_id=p_concept.id))

    db.commit()
    return list(concepts_by_slug.values())


def add_prerequisite(db: Session, concept_id: str, prerequisite_id: str) -> None:
    """Add a prerequisite relationship, guaranteeing DAG acyclicity."""
    if concept_id == prerequisite_id:
        raise CyclicPrerequisiteError("A concept cannot be a prerequisite of itself.")

    # Cycle check via DFS: can we reach concept_id starting from prerequisite_id?
    visited = set()
    stack = [prerequisite_id]
    while stack:
        curr = stack.pop()
        if curr == concept_id:
            raise CyclicPrerequisiteError("Cycle detected: adding this prerequisite creates a loop in the taxonomy graph.")
        if curr not in visited:
            visited.add(curr)
            # Find prerequisites of curr
            parents = db.scalars(select(ConceptPrerequisite.prerequisite_id).where(
                ConceptPrerequisite.concept_id == curr
            )).all()
            stack.extend(parents)

    edge = ConceptPrerequisite(concept_id=concept_id, prerequisite_id=prerequisite_id)
    db.add(edge)
    db.commit()


# ---------------- Bayesian Knowledge Tracing Mastery ----------------
def update_bkt_mastery(
    db: Session,
    user_id: str,
    concept_id: str,
    is_correct: bool,
) -> ConceptMastery:
    """Update concept mastery using Bayesian Knowledge Tracing (BKT).

    Formulas:
    P(L_t | obs=1) = [P(L_t) * (1 - P(S))] / [P(L_t)*(1 - P(S)) + (1 - P(L_t))*P(G)]
    P(L_t | obs=0) = [P(L_t) * P(S)] / [P(L_t)*P(S) + (1 - P(L_t))*(1 - P(G))]
    P(L_{t+1}) = P(L_t | obs) + (1 - P(L_t | obs)) * P(T)
    """
    mastery = db.scalar(select(ConceptMastery).where(
        ConceptMastery.user_id == user_id,
        ConceptMastery.concept_id == concept_id,
    ))

    if not mastery:
        mastery = ConceptMastery(
            user_id=user_id,
            concept_id=concept_id,
            bkt_p_know=0.15,
            bkt_p_transit=0.20,
            bkt_p_slip=0.10,
            bkt_p_guess=0.20,
            total_attempts=0,
            successful_attempts=0,
        )
        db.add(mastery)
        db.flush()

    p_know = mastery.bkt_p_know
    p_slip = mastery.bkt_p_slip
    p_guess = mastery.bkt_p_guess
    p_trans = mastery.bkt_p_transit

    if is_correct:
        numerator = p_know * (1.0 - p_slip)
        denominator = numerator + ((1.0 - p_know) * p_guess)
        p_obs = numerator / max(1e-6, denominator)
        mastery.successful_attempts += 1
    else:
        numerator = p_know * p_slip
        denominator = numerator + ((1.0 - p_know) * (1.0 - p_guess))
        p_obs = numerator / max(1e-6, denominator)

    p_next = p_obs + ((1.0 - p_obs) * p_trans)
    mastery.bkt_p_know = max(0.01, min(0.99, round(p_next, 4)))
    mastery.mastery_score = mastery.bkt_p_know
    mastery.total_attempts += 1
    mastery.confidence = min(0.95, round(0.3 + (0.1 * min(7, mastery.total_attempts)), 2))
    mastery.last_assessed_at = utcnow()

    db.commit()
    db.refresh(mastery)
    return mastery


def get_user_mastery_map(db: Session, user_id: str) -> list[dict[str, Any]]:
    """Get mastery scores for all concepts for a user."""
    seed_concept_taxonomy(db)
    concepts = list(db.scalars(select(Concept).order_by(Concept.target_depth)).all())
    masteries = {m.concept_id: m for m in db.scalars(select(ConceptMastery).where(ConceptMastery.user_id == user_id)).all()}

    res = []
    for c in concepts:
        m = masteries.get(c.id)
        score = m.mastery_score if m else 0.1
        status = "mastered" if score >= 0.75 else ("in_progress" if score >= 0.4 else "struggling")
        res.append({
            "concept_id": c.id,
            "slug": c.slug,
            "name": c.name,
            "category": c.category,
            "difficulty": c.difficulty.value,
            "mastery_score": round(score, 2),
            "confidence": m.confidence if m else 0.2,
            "total_attempts": m.total_attempts if m else 0,
            "status": status,
        })
    return res


# ---------------- Learning-Gap Radar ----------------
def detect_learning_gaps(db: Session, user_id: str) -> list[dict[str, Any]]:
    """Traverse prerequisite DAG to identify root prerequisite gaps."""
    seed_concept_taxonomy(db)
    concepts = {c.id: c for c in db.scalars(select(Concept)).all()}
    prereqs = list(db.scalars(select(ConceptPrerequisite)).all())

    # Build parent map: target -> list of prerequisites
    parents: dict[str, list[str]] = {}
    for p in prereqs:
        parents.setdefault(p.concept_id, []).append(p.prerequisite_id)

    masteries = {m.concept_id: m.mastery_score for m in db.scalars(select(ConceptMastery).where(ConceptMastery.user_id == user_id)).all()}

    gaps = []
    for cid, c in concepts.items():
        score = masteries.get(cid, 0.1)
        # If student is struggling with this concept, check prerequisites
        if score < 0.6:
            # Trace down prerequisites to find deepest weak root
            queue = list(parents.get(cid, []))
            deepest_gap = None
            visited = set()

            while queue:
                curr_pid = queue.pop(0)
                if curr_pid in visited:
                    continue
                visited.add(curr_pid)
                p_score = masteries.get(curr_pid, 0.1)
                if p_score < 0.6:
                    deepest_gap = concepts.get(curr_pid)
                    # Check its parents
                    queue.extend(parents.get(curr_pid, []))

            if deepest_gap and deepest_gap.id != cid:
                gaps.append({
                    "target_concept": c.name,
                    "target_slug": c.slug,
                    "current_mastery": round(score, 2),
                    "root_gap_concept": deepest_gap.name,
                    "root_gap_slug": deepest_gap.slug,
                    "root_mastery": round(masteries.get(deepest_gap.id, 0.1), 2),
                    "reason": f"Difficulties in {c.name} stem from incomplete mastery of prerequisite '{deepest_gap.name}'.",
                    "recommended_practice": f"Review focused examples and exercises on {deepest_gap.name} before retrying {c.name}.",
                })

    return gaps


# ---------------- Spaced-Repetition Scheduler ----------------
def schedule_revision(
    db: Session,
    user_id: str,
    concept_id: str,
    performance_rating: int,  # 1 (blackout) to 5 (perfect recall)
) -> RevisionSchedule:
    """Schedule next revision using SuperMemo SM-2 spaced repetition."""
    rev = db.scalar(select(RevisionSchedule).where(
        RevisionSchedule.user_id == user_id,
        RevisionSchedule.concept_id == concept_id,
    ))

    if not rev:
        rev = RevisionSchedule(
            user_id=user_id,
            concept_id=concept_id,
            interval_days=1,
            repetitions=0,
            ease_factor=2.5,
        )
        db.add(rev)
        db.flush()

    q = max(1, min(5, performance_rating))

    # SM-2 calculation
    if q >= 3:
        if rev.repetitions == 0:
            rev.interval_days = 1
        elif rev.repetitions == 1:
            rev.interval_days = 6
        else:
            rev.interval_days = int(round(rev.interval_days * rev.ease_factor))
        rev.repetitions += 1
    else:
        rev.repetitions = 0
        rev.interval_days = 1

    rev.ease_factor = max(1.3, round(rev.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), 2))
    rev.last_revised_at = utcnow()
    rev.due_date = utcnow() + timedelta(days=rev.interval_days)
    rev.status = RevisionStatus.PENDING

    db.commit()
    db.refresh(rev)
    return rev


def get_revision_list(db: Session, user_id: str) -> dict[str, Any]:
    """Retrieve due, overdue, and upcoming revisions."""
    now = utcnow()
    rows = list(
        db.scalars(
            select(RevisionSchedule)
            .where(RevisionSchedule.user_id == user_id)
            .order_by(RevisionSchedule.due_date)
        ).all()
    )

    concepts = {c.id: c.name for c in db.scalars(select(Concept)).all()}

    due = []
    upcoming = []

    for r in rows:
        due_aware = as_aware(r.due_date)
        is_due = due_aware is not None and due_aware <= now
        item = {
            "id": r.id,
            "concept_id": r.concept_id,
            "concept_name": concepts.get(r.concept_id, "Unknown"),
            "due_date": r.due_date.isoformat(),
            "interval_days": r.interval_days,
            "repetitions": r.repetitions,
            "status": "overdue" if (due_aware and due_aware < now) else "upcoming",
        }
        if is_due:
            due.append(item)
        else:
            upcoming.append(item)

    return {"due": due, "upcoming": upcoming}

import networkx as nx
from pprint import pprint
from collections import namedtuple
import itertools

SOURCE = "source"
SINK = "sink"
UNMATCHABLE_EDGE_WEIGHT = 1000
SLOT_NODE_PREFIX = "slot"
MENTOR_NODE_PREFIX = "mentor"

MentorTuple = namedtuple("MentorTuple", "id")
SlotTuple = namedtuple("SlotTuple", "id min_mentors max_mentors")
PreferenceTuple = namedtuple("PreferenceTuple", "mentor_id slot_id preference_value")


class MatcherValidationError(ValueError):
    """
    Validation error when running the matcher.
    """


def slot_node_name(slot_id):
    return SLOT_NODE_PREFIX + str(slot_id)


def mentor_node_name(mentor_id):
    return MENTOR_NODE_PREFIX + str(mentor_id)


def slot_id_from_node(node_name):
    return int(node_name.replace(SLOT_NODE_PREFIX, ""))


def mentor_id_from_node(node_name):
    return int(node_name.replace(MENTOR_NODE_PREFIX, ""))


def get_matches(mentors, slots, preferences):
    total_min_capacities = sum([slot.min_mentors for slot in slots])
    total_max_capacities = sum([slot.max_mentors for slot in slots])
    # validate capacities
    if total_min_capacities > total_max_capacities:
        raise MatcherValidationError(
            "Total minimum slot capacities are greater than total maximum slot capacities."
        )
    # validate number of slots
    if total_max_capacities < len(mentors):
        raise MatcherValidationError("There are more mentors than available slots.")
    if total_min_capacities > len(mentors):
        raise MatcherValidationError("Not enough mentors to fulfill slot requirements.")
    G = nx.DiGraph()
    G.add_node(SOURCE, demand=-len(mentors))
    G.add_node(SINK, demand=len(mentors) - total_min_capacities)
    # add mentor nodes and edges from source
    for mentor in mentors:
        mentor_id = mentor.id
        G.add_node(mentor_node_name(mentor_id), demand=0)
        G.add_edge(SOURCE, mentor_node_name(mentor_id), weight=1, capacity=1)
    # add slot nodes and edges to sink
    for slot in slots:
        slot_id, min_mentors, max_mentors = slot.id, slot.min_mentors, slot.max_mentors
        if min_mentors > max_mentors:
            raise MatcherValidationError(
                "Minimum slot capacity is greater than maximum slot capacity."
            )
        node_name = slot_node_name(slot_id)
        G.add_node(node_name, demand=min_mentors)
        G.add_edge(node_name, SINK, weight=1, capacity=max_mentors - min_mentors)

    # create edges from mentor nodes to slot nodes
    for preference in preferences:
        mentor_id, slot_id, preference_num = (
            preference.mentor_id,
            preference.slot_id,
            preference.preference_value,
        )
        if preference_num == 0:
            preference_weight = UNMATCHABLE_EDGE_WEIGHT
        else:
            preference_weight = round(1 / preference_num * 100, 0)
        G.add_edge(
            mentor_node_name(mentor_id),
            slot_node_name(slot_id),
            weight=preference_weight,
            capacity=1,
        )
    flow_cost, flow_dict = nx.network_simplex(G)
    mentors_set = set(itertools.chain(*mentors))
    assignments = {}
    pprint(flow_dict)
    for u in flow_dict:
        for v in flow_dict[u]:
            if (
                flow_dict[u][v] >= 1
                and u != SOURCE
                and v != SINK
                and G[u][v]["weight"] != UNMATCHABLE_EDGE_WEIGHT
            ):
                assignments[mentor_id_from_node(u)] = slot_id_from_node(v)
                mentors_set.remove(mentor_id_from_node(u))
    unmatched_mentors = sorted(mentors_set)
    return (assignments, unmatched_mentors)

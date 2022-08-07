import networkx as nx
from pprint import pprint

SOURCE = "source"
SINK = "sink"
UNMATCHABLE_EDGE_WEIGHT = 1000
SLOT_NODE_PREFIX = "slot"
MENTOR_NODE_PREFIX = "mentor"


def slot_node_name(slot_id):
    return SLOT_NODE_PREFIX + str(slot_id)


def mentor_node_name(mentor_id):
    return MENTOR_NODE_PREFIX + str(mentor_id)


def slot_id_from_node(node_name):
    return int(node_name.replace(SLOT_NODE_PREFIX, ""))


def mentor_id_from_node(node_name):
    return int(node_name.replace(MENTOR_NODE_PREFIX, ""))


def get_matches(mentors, slots, preferences):
    G = nx.DiGraph()
    G.add_node(SOURCE, demand=-len(mentors))
    G.add_node(SINK, demand=len(mentors)-sum([slot["min_mentors"] for slot in slots]))
    # add mentor nodes and edges from source
    for mentor_id in mentors:
        G.add_node(mentor_node_name(mentor_id), demand=0)
        G.add_edge(SOURCE, mentor_node_name(mentor_id), weight=1, capacity=1)
    # add slot nodes and edges to sink
    for slot in slots:
        slot_id, min_mentors, max_mentors = slot["id"], slot["min_mentors"], slot["max_mentors"]
        node_name = slot_node_name(slot_id)
        G.add_node(node_name, demand=min_mentors)
        G.add_edge(node_name, SINK, weight=1, capacity=max_mentors)
    # create edges from mentor nodes to slot nodes
    for preference in preferences:
        mentor_id, slot_id, preference_num = preference["mentor_id"], preference["slot_id"], preference["preference_value"]
        if preference_num == 0:
            preference_weight = UNMATCHABLE_EDGE_WEIGHT
        else:
            preference_weight = round(1/preference_num*100, 0)
        G.add_edge(mentor_node_name(mentor_id), slot_node_name(slot_id), weight=preference_weight, capacity=1)
    flow_cost, flow_dict = nx.network_simplex(G)
    mentors_set = set(mentors)
    assignments = {}
    pprint(flow_dict)
    for u in flow_dict:
        for v in flow_dict[u]:
            # print(u,v,flow_dict[u][v])
            if flow_dict[u][v] == 1 and u != SOURCE and v != SINK:
                assignments[mentor_id_from_node(u)] = slot_id_from_node(v)
                mentors_set.remove(mentor_id_from_node(u))
    unmatched_mentors = list(mentors_set)
    return (assignments, unmatched_mentors)


# mentors = [100, 200, 300]
# slots = list(map(lambda arr: {"id": arr[0], "min_mentors": arr[1], "max_mentors": arr[2]},list([[1, 1, 3], [2, 1, 2], [3, 1, 1]])))
# preferences = list(map(lambda arr: {"mentor_id": arr[0], "slot_id": arr[1], "preference_valeu": arr[2]}, [(100, 1, 4), (100, 2, 1), (100, 3, 3), (100, 4, 2), (100, 5, 5),
#                (200, 1, 5), (200, 2, 3), (200, 3, 0), (200, 4, 0), (200, 5, 0),
#                (300, 1, 5), (300, 2, 4), (300, 3, 0), (300, 4, 0), (300, 5, 0)]))
# print(get_matches(mentors, slots, preferences))

import networkx as nx
from pprint import pprint

SOURCE = "source"
SINK = "sink"
CANNOT_MAKE_TIME_WEIGHT = 1000
SLOT_NODE_PREFIX = "slot"
MENTOR_NODE_PREFIX = "mentor"


def slot_node(slot_id):
    return SLOT_NODE_PREFIX + str(slot_id)


def mentor_node(mentor_id):
    return MENTOR_NODE_PREFIX + str(mentor_id)


def slot_id_from_node(node_name):
    return int(node_name[4:])


def mentor_id_from_node(node_name):
    return int(node_name[6:])


def get_matches(mentors, slots, preferences):
    G = nx.DiGraph()
    G.add_node(SOURCE, demand=-len(mentors))
    G.add_node(SINK, demand=len(mentors))
    for mentor_id in mentors:
        G.add_node(mentor_node(mentor_id), demand=0)
        G.add_edge(SOURCE, mentor_node(mentor_id), weight=1, capacity=1)
    for slot_id in slots:
        G.add_node(slot_node(slot_id), demand=0)
        G.add_edge(slot_node(slot_id), SINK, weight=1, capacity=1)
    for preference in preferences:
        (mentor_id, slot_id, preference_num) = preference
        if preference_num != 0:
            G.add_edge(mentor_node(mentor_id), slot_node(slot_id), weight=round(1/preference_num*100, 0), capacity=1)
        else:
            G.add_edge(mentor_node(mentor_id), slot_node(slot_id), weight=CANNOT_MAKE_TIME_WEIGHT, capacity=1)
    # print(G.edges)
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


mentors = [100, 200, 300]
slots = [1, 2, 3, 4, 5]
preferences = [(100, 1, 4), (100, 2, 1), (100, 3, 3), (100, 4, 2), (100, 5, 5),
               (200, 1, 5), (200, 2, 3), (200, 3, 0), (200, 4, 0), (200, 5, 0),
               (300, 1, 5), (300, 2, 4), (300, 3, 0), (300, 4, 0), (300, 5, 0)]
# print(get_matches(mentors, slots, preferences))
# get_matches(mentors, slots, preferences)

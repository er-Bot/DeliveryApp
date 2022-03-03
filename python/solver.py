import json
import math
import requests
import ast
import json

class Manager:
    def __init__(self, file, max_distance=10000, max_duration=30*60, max_orders=5, min_distance=1, min_duration=1, min_orders=1):
        self.data = DataManager()
        self.data.load(file)
        ###  Instead of a file, consider passing the data manager as arg

        self.max_distance = max_distance
        self.max_duration = max_duration
        self.max_orders = max_orders

        self.min_distance = min_distance
        self.min_duration = min_duration
        self.min_orders = min_orders

        self.keys = {}
        self.indices = {}

        pkeys = list(self.data.pickups.keys())
        c = 0
        for i in range(len(pkeys)):
            self.keys[f"P{i}"] = pkeys[i]
            self.indices[f"P{i}"] = c
            c += 1
        dkeys = list(self.data.deliveries.keys())
        for i in range(len(dkeys)):
            self.keys[f"D{i}"] = dkeys[i] 
            self.indices[f"D{i}"] = c
            c += 1

    def get_dist(self, src, dst):
        if src == 'AG' and 'P' in dst:
            return self.data.agent_distance_matrix[self.indices[dst]]
        return self.data.distance_matrix[self.indices[src]][self.indices[dst]]

    def get_time(self, src, dst):
        if src == 'AG' and 'P' in dst:
            return self.data.agent_time_matrix[self.indices[dst]]
        return self.data.time_matrix[self.indices[src]][self.indices[dst]]

    def path_distance(self, path):
        s = 0
        for i in range(1, len(path)):
            s += self.get_dist(path[i-1], path[i])
        return s

    def path_time(self, path):
        s = 0
        for i in range(1, len(path)):
            s += self.get_time(path[i-1], path[i])
        return s

class DataManager:
    def __init__(self):
        self.restaurants_data = []
        self.orders_data = []

        self.pickups = {}
        self.deliveries = {}
        self.orders = []

        self.distance_matrix = []
        self.time_matrix = []

        self.agent_distance_matrix = []
        self.agent_time_matrix = []

    def load(self, file):
        with open(file, 'r') as f:
            # Agent
            l = f.readline()
            self.agent_pos = [float(x) for x in l.split(':')[1][1:-2].split(',')]

            l = f.readline() # Pickups
            while True:
                l = f.readline()
                if 'Deliveries' not in l:
                    lf = l.split(':')
                    key = lf[0]
                    coord = list(float(c) for c in lf[1][1:-2].split(', '))
                    self.pickups[key] = coord
                else:
                    break

            while True:
                l = f.readline()
                if 'Orders' not in l:
                    lf = l.split(':')
                    key = lf[0]
                    coord = list(float(c) for c in lf[1][1:-2].split(', '))
                    self.deliveries[key] = coord
                else:
                    break

            while True:
                l = f.readline()
                if 'Distance Matrix' not in l:
                    p, d = l.split(' -> ')
                    self.orders.append((p,d[:-1]))
                else:
                    break

            while True: 
                l = f.readline()
                if 'Time Matrix:' not in l:
                    self.distance_matrix.append([int(v) for v in l[:-1].split(',')])
                else:
                    break

            while True: 
                l = f.readline()
                if 'Agent Distance Matrix' not in l:
                    self.time_matrix.append([int(v) for v in l[:-1].split(',')])
                else:
                    break

            l = f.readline() # agend distance matrix data
            for v in l[:-1].split(','):
                self.agent_distance_matrix.append(int(v))

            l = f.readline() # Agent Time Matrix:
            l = f.readline() # agent time matrix data
            for v in l[:-1].split(','):
                self.agent_time_matrix.append(int(v))

class DynamicProgrammerTW(Manager):
    def __init__(self, file, max_distance=10000, max_duration=30*60, max_orders=6, min_distance=1, min_duration=1, min_orders=1):
        super().__init__(file, max_distance, max_duration, max_orders, min_distance, min_duration, min_orders)

        self.p_nodes = {k:v for (k,v) in self.keys.items() if 'P' in k}
        self.d_nodes = {k:v for (k,v) in self.keys.items() if 'D' in k}

    def find_recommended_paths(self, num_paths=5, verbose=False):
        self.num_paths = num_paths

        self.worst_best_path_cost = float('inf')
        self.paths = []

        self.dynamic_programming(['AG'], verbose=verbose)

    def get_deliveries(self, pickup):
        devs = []
        for o in self.data.orders:
            if o[0] == self.keys[pickup]:
                devs.append(list(self.keys.keys())[list(self.keys.values()).index(o[1])])
        return devs

    def get_next_nodes(self, path):
        if path == ['AG']:
            nodes = list(self.p_nodes.keys())
            nodes = sorted(nodes, key=lambda k: self.get_time(path[-1], k))
            return nodes

        nodes = []
        for k in self.p_nodes.keys():
            if k not in path:
                nodes.append(k)

        for k in path:
            if k in self.p_nodes.keys():
                delivs = self.get_deliveries(k)
                for d in delivs:
                    if d not in path:
                        nodes.append(d)

        nodes = sorted(nodes, key=lambda k: self.get_time(path[-1], k))
        return nodes

    def add_path(self, path, duration, verbose=False):
        if verbose:
            print("\nTesting", path)
            print("Worst So Far", self.worst_best_path_cost)
        
        if len(self.paths) < self.num_paths:
            self.paths.append((path, duration))
        
        if duration < self.worst_best_path_cost:
            self.paths[-1] = (path, duration)
        
        self.paths = sorted(self.paths, key=lambda k: k[1])
        self.worst_best_path_cost = self.paths[-1][1]
        
        if verbose:
            print(f"Puch T:{duration}, P:{path}")

    def dynamic_programming(self, path, verbose=False):
        if verbose:
            print("=================================")
            print("Current  : ", path)

        duration = self.path_time(path)
        if verbose:
            print("Duration : ", duration, "Max", self.max_duration)
        if duration > self.max_duration:
            if verbose:
                print("Break")
            return

        nodes = self.get_next_nodes(path)
        if verbose:
            print("Nexts: ", nodes)
            print("Best Paths:")
            for p in self.paths:
                print('\t', p)
            print('---------------------------------')

        if len(nodes) == 1:
            if 'P' in nodes[0]:
                if len(self.p_nodes) == 1:
                    path.append(nodes[0])
                    self.dynamic_programming(path, verbose)
                return
            if 'D' in nodes[0]:
                path.append(nodes[0])
                self.add_path(path, duration, verbose)
                return
    
        if len([1 for n in path if 'D' in n]) >= self.max_orders:
            self.add_path(path, duration, verbose)
            if verbose:
                for p in self.paths:
                    print(p)
            return

        for n in nodes:
            p = path.copy()
            p.append(n)
            self.dynamic_programming(p, verbose=verbose)

    def get_pickup(self, order):
        for (pick, deli) in self.data.orders:
            if deli == order:
                return pick

    def get_response(self, save=""):
        responses = []
        for idx, p in enumerate(self.paths):
            steps = []
            for n in p[0]:
                if 'P' in n:
                    step = {
                        'order': 'none',
                        'location': self.p_nodes[n],
                        'action': 'pickup',
                        'coordinates': self.data.pickups[self.p_nodes[n]] 
                    }
                    steps.append(step)
                elif 'D' in n:
                    pid = self.get_pickup(self.d_nodes[n])
                    step = {
                        'order': self.d_nodes[n],
                        'location': pid,
                        'action': 'delivery',
                        'coordinates': self.data.deliveries[self.d_nodes[n]]
                    }
                    steps.append(step)

            for i, step in enumerate(steps):
                if step['action'] == 'pickup' and step['order'] == 'none':
                    picks = []
                    for j in range(0, len(steps)):
                        if steps[j]['action'] == 'delivery' and steps[j]['location'] == step['location']:
                            pick_step = step.copy()
                            pick_step['order'] = steps[j]['order']
                            picks.append(pick_step)
                    steps = steps[:i] + picks + steps[i+1:]

            responses.append({
                'steps': steps,
                'time': p[1]
            })

        if save != "":
            with open(save, 'w', encoding='utf-8') as f:
                json.dump(responses, f, ensure_ascii=False, indent=4)

        return responses
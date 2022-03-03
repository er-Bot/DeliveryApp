var manager = require('./manager.js')

class Solver extends manager.Manager{
    p_nodes;
    d_nodes;
    num_paths;
    worst_best_path_cost;
    paths;
    
    constructor(file, max_duration, max_orders){
        super(file, max_duration, max_orders)
        
        this.p_nodes = Object.keys(this.keys).filter(k => k.includes('P')).reduce((obj,k)=>{
            obj[k] = this.keys[k];
            return obj;
        }, {})
        
        this.d_nodes = Object.keys(this.keys).filter(k => k.includes('D')).reduce((obj,k)=>{
            obj[k] = this.keys[k];
            return obj;
        }, {})
    }

    async find_recommended_paths(num_paths=5, verbose){
        this.num_paths = num_paths

        this.worst_best_path_cost = Infinity
        this.paths = []
       
        this.dynamic_programming(['AG'], verbose)
    }

    get_deliveries(pickup){
        let devs = []
        for(const o of this.data.orders){
            if(o[0] == this.keys[pickup]){
                devs.push(Object.keys(this.keys)[Object.values(this.keys).indexOf(o[1])])
            }
        }
        return devs
    }

    get_next_nodes(path){
        if(path.length === 1 && path[0] === "AG"){
            let nodes = Object.keys(this.p_nodes)
            nodes.sort((a,b)=>{
                let da = this.get_time(path[0], a)
                let db = this.get_time(path[0], b)
                if(da > db) return 1
                if(da < db) return -1
                return 0
            }) 
            
            return nodes
        }

        let nodes = []
        nodes = nodes.concat(Object.keys(this.p_nodes).filter(k => !path.includes(k)))
        
        for(const k of path){
            if(Object.keys(this.p_nodes).includes(k)){
                let delivs = this.get_deliveries(k)
                nodes = nodes.concat(delivs.filter(k => !path.includes(k)))
            }
        }

        nodes.sort((a,b)=>{
            let da = this.get_time(path.slice(-1), a)
            let db = this.get_time(path.slice(-1), b)
            if(da > db) return 1
            if(da < db) return -1
            return 0
        })

        return nodes
    }

    add_path(path, duration, verbose){
        if(verbose){
            console.log("\nTesting", path)
            console.log("Worst So Far", this.worst_best_path_cost)
        }

        if(this.paths.length < this.num_paths){
            this.paths.push([path, duration])
            return
        }
        
        if(duration < this.worst_best_path_cost){
            this.paths[this.num_paths - 1] = [path, duration]
        }
        
        this.paths.sort((a,b)=>{
            let da = a[1]
            let db = b[1]
            if(da > db) return 1
            if(da < db) return -1
            return 0
        })

        this.worst_best_path_cost = this.paths[this.num_paths - 1][1]
        
        if(verbose)
            console.log("Puch T: ", duration, "P:", path)
    }

    dynamic_programming(path, verbose){
        if(verbose){
            console.log("=================================")
            console.log("Current  : ", path)
        }

        let duration = this.path_time(path)
        if(verbose) console.log("Duration", duration, "\tMax-Duration", this.max_duration)
        if(duration > this.max_duration){
            if(verbose) console.log("Break")
            return
        }
        
        let nodes = this.get_next_nodes(path)
        if(verbose) console.log("Next     : ", nodes)
        
        if(nodes.length == 1){
            if(nodes[0].includes('P')){
                if(Object.keys(this.p_nodes).length == 1){
                    path.push(nodes[0])
                    this.dynamic_programming(path, verbose)
                }
                return
            }
            if(nodes[0].includes('D')){
                path.push(nodes[0])
                this.add_path(path, duration, verbose)
                return
            }
        }

        if(path.filter(k => k.includes('D')).length >= this.max_orders){
            this.add_path(path, duration, verbose)
            if(verbose){
                for(const p of this.paths){
                    console.log(p);
                }
            }
        }

        for(let n of nodes){
            let p = [...path]
            p.push(n)
            this.dynamic_programming(p, verbose)
        }
    }

    get_pickup(order){
        for(const o of this.data.orders){
            if(o[1] == order)
                return o[0]
        }
    }

    get_response(){
        let responses = []
        for(const p of this.paths){
            let steps = []
            for(const n of p[0]){
                if(n.includes('P')){
                    let step = {
                        'order': 'none',
                        'location': this.p_nodes[n],
                        'action': 'pickup',
                        'coordinates': this.data.pickups[this.p_nodes[n]] 
                    }
                    steps.push(step)
                }
                else if(n.includes('D')){
                    let pid = this.get_pickup(this.d_nodes[n])
                    let step = {
                        'order': this.d_nodes[n],
                        'location': pid,
                        'action': 'delivery',
                        'coordinates': this.data.deliveries[this.d_nodes[n]]
                    }
                    steps.push(step)
                }
            }

            for(let i=0; i<steps.length; i++){
                if(steps[i]['action'] == 'pickup' && steps[i]['order'] == 'none'){
                    let picks = []
                    for(let j=0; j<steps.length; j++){
                        if(steps[j]['action'] == 'delivery' && steps[j]['location'] == steps[i]['location']){
                            let pick_step = {...steps[i]}
                            pick_step['order'] = steps[j]['order']
                            picks.push(pick_step)
                        }
                    }
                    steps = steps.slice(0, i).concat(picks.concat(steps.slice(i+1)))
                }
            }
            
            responses.push({
                'steps': steps,
                'time': p[1]
            })
        }
        return responses
    }
}

exports.Solver = Solver;
var datamanager = require('./datamanager.js')

class Manager{
    data;
    max_duration;
    max_orders;
    keys;
    indices;

    constructor(file, max_duration, max_orders){
        this.data = new datamanager.DataManager()
        this.data.load(file)
        
        this.max_duration = max_duration
        this.max_orders = max_orders
        
        this.keys = {}
        this.indices = {}

        let pkeys = Object.keys(this.data.pickups)
        let dkeys = Object.keys(this.data.deliveries)
        let c = 0;
        for(let i=0; i < pkeys.length; i++){
            this.keys["P"+i] = pkeys[i]
            this.indices["P"+i] = c
            c += 1
        }
        for(let i=0; i < dkeys.length; i++){
            this.keys["D"+i] = dkeys[i]
            this.indices["D"+i] = c
            c += 1
        }
    }

    get_dist(src, dst){
        if(src === 'AG' && dst.includes('P'))
            return this.data.agent_distance_matrix[this.indices[dst]]
        return this.data.distance_matrix[this.indices[src]][this.indices[dst]]
    }

    get_time(src, dst){
        if(src === 'AG' && dst.includes('P'))
            return this.data.agent_time_matrix[this.indices[dst]]
        return this.data.time_matrix[this.indices[src]][this.indices[dst]]
    }

    path_distance(path){
        let s = 0;
        for(let i=1; i < path.length; i++)
            s += this.get_dist(path[i-1], path[i])
        return s
    }

    path_time(path){
        let s = 0;
        for(let i=1; i < path.length; i++)
            s += this.get_time(path[i-1], path[i])
        return s
    }
}

exports.Manager = Manager;
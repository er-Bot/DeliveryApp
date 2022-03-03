const fs = require('fs');

class DataManager {
    pickups;
    deliveries;
    orders;
    distance_matrix;
    time_matrix;
    agent_distance_matrix;
    agent_time_matrix;
    agent_pos;

    constructor(){
        this.agent_pos = []
        this.pickups = {}
        this.deliveries = {}
        this.orders = []
        this.distance_matrix = []
        this.time_matrix = []
        this.agent_distance_matrix = []
        this.agent_time_matrix = []
    }

    load(path){
        var data = fs.readFileSync(path, 'utf8')
        let lines = data.split('\n')
        
        var aFlag = 0;
        var pFlag = 0;
        var dFlag = 0;
        var oFlag = 0;
        var dmFlag = 0;
        var tmFlag = 0;
        var admFlag = 0;
        var atmFlag = 0;

        for(let i=0; i < lines.length; i++){
            if (lines[i].includes("Agent:")) aFlag = i;
            else if(lines[i].includes("Pickups:")) pFlag = i;   
            else if(lines[i].includes("Deliveries:")) dFlag = i;   
            else if(lines[i].includes("Orders:")) oFlag = i;   
            else if(lines[i].indexOf("Distance Matrix:") === 0) dmFlag = i;   
            else if(lines[i].indexOf("Time Matrix:") === 0) tmFlag = i;   
            else if(lines[i].includes("Agent Distance Matrix:")) admFlag = i;   
            else if(lines[i].includes("Agent Time Matrix:")) atmFlag = i;
        }

        let coords = lines[aFlag].split(':')[1].slice(1, -2).split(', ')
        this.agent_pos = [Number(coords[0]), Number(coords[1])]

        for(let i=pFlag+1; i<dFlag; i++){
            coords = lines[i].split(':')[1].slice(1, -2).split(', ')
            this.pickups[lines[i].split(':')[0]] = [Number(coords[0]), Number(coords[1])]
        }

        for(let i=dFlag+1; i<oFlag; i++){
            coords = lines[i].split(':')[1].slice(1, -2).split(', ')
            this.deliveries[lines[i].split(':')[0]] = [Number(coords[0]), Number(coords[1])]
        }

        for(let i=oFlag+1; i<dmFlag; i++){
            let order = lines[i].split(' -> ')
            this.orders.push([order[0], order[1].slice(0,-1)])
        }

        for(let i=dmFlag+1; i<tmFlag; i++){
            let fields = lines[i].slice(0, -1).split(',')
            fields = fields.map((elem) => {
                return Number(elem)
            });
            this.distance_matrix.push(fields)
        }

        for(let i=tmFlag+1; i<admFlag; i++){
            let fields = lines[i].slice(0, -1).split(',')
            fields = fields.map((elem) => {
                return Number(elem)
            });
            this.time_matrix.push(fields)
        }
 
        let fields = lines[admFlag+1].slice(0, -1).split(',')
        this.agent_distance_matrix = fields.map((elem) => {
            return Number(elem)
        });

        fields = lines[atmFlag+1].slice(0, -1).split(',')
        this.agent_time_matrix = fields.map((elem) => {
            return Number(elem)
        });
    }
}

exports.DataManager = DataManager;
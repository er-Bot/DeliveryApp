import json
from flask import Flask, Response
from solver import DynamicProgrammerTW

app = Flask(__name__)

@app.route('/path', methods=['GET'])
def path():
    dp = DynamicProgrammerTW('../data/test.txt', max_duration=30*60, max_orders=5)
    dp.find_recommended_paths(num_paths=5)
    res = dp.get_response()
    return Response(json.dumps(res), mimetype='application/json')

if __name__ == "__main__":
    app.run()
from flask import Flask, render_template, request, jsonify
import duckdb
import numpy as np

app = Flask(__name__)

DATA = "C:\Users\danny\Downloads\cs178_midterm_dataset\placementdata.csv"

# Column definitions
continuous_columns = ['CGPA', 'AptitudeTestScore', 'SoftSkillsRating', 'SSC_Marks', 'HSC_Marks', 'Internships', 'Projects']
discrete_columns   = ['ExtracurricularActivities', 'PlacementTraining']
axis_options       = continuous_columns 
facet_column       = 'PlacementStatus'
facet_values       = ['Placed', 'NotPlaced']


def get_filter_ranges():
    """Return {column: [min, max]} for every continuous column."""
    selects = ', '.join([f'MIN("{c}"), MAX("{c}")' for c in continuous_columns])
    row = duckdb.sql(f'SELECT {selects} FROM "{DATA}"').df().iloc[0]
    ranges = {}
    i = 0
    for col in continuous_columns:
        ranges[col] = [row.iloc[i], row.iloc[i + 1]]
        i += 2
    return ranges


def build_predicate(request_data):
    """Build a SQL WHERE clause from the POST request payload."""
    parts = []

    for col in continuous_columns:
        if col in request_data:
            lo, hi = request_data[col]
            parts.append(f'"{col}" >= {lo} AND "{col}" <= {hi}')

    bool_cols = ['ExtracurricularActivities', 'PlacementTraining']
    for col in bool_cols:
        if col in request_data:
            selected = request_data[col] 
            if selected:
                bool_literals = ', '.join(selected)  
                parts.append(f'CAST("{col}" AS VARCHAR) IN ({bool_literals})')

    return ' AND '.join(parts) if parts else 'TRUE'


def compute_regression(x_vals, y_vals):
    """Return slope and intercept of least-squares regression line, or None if too few points."""
    if len(x_vals) < 2:
        return None, None
    slope, intercept = np.polyfit(x_vals, y_vals, 1)
    return float(slope), float(intercept)


@app.route('/')
def index():
    filter_ranges = get_filter_ranges()

    default_x, default_y = axis_options[0], axis_options[1]
    ranges_row = duckdb.sql(
        f'SELECT MIN("{default_x}"), MAX("{default_x}"), MIN("{default_y}"), MAX("{default_y}") FROM "{DATA}"'
    ).df().iloc[0]
    scatter_ranges = {
        'x': [float(ranges_row.iloc[0]), float(ranges_row.iloc[1])],
        'y': [float(ranges_row.iloc[2]), float(ranges_row.iloc[3])],
    }

    return render_template(
        'index.html',
        axis_options=axis_options,
        facet_values=facet_values,
        filter_ranges=filter_ranges,
        scatter_ranges=scatter_ranges,
        default_x=default_x,
        default_y=default_y,
    )


@app.route('/update', methods=['POST'])
def update():
    request_data = request.get_json()

    x_col = request_data.get('x_col', axis_options[0])
    y_col = request_data.get('y_col', axis_options[1])

    predicate = build_predicate(request_data)

    ranges_row = duckdb.sql(
        f'SELECT MIN("{x_col}"), MAX("{x_col}"), MIN("{y_col}"), MAX("{y_col}") FROM "{DATA}" WHERE {predicate}'
    ).df().iloc[0]
    scatter_ranges = {
        'x': [float(ranges_row.iloc[0]), float(ranges_row.iloc[1])],
        'y': [float(ranges_row.iloc[2]), float(ranges_row.iloc[3])],
    }

    facet_data = {}
    for fval in facet_values:
        facet_predicate = f'{predicate} AND "{facet_column}" = \'{fval}\''
        df = duckdb.sql(
            f'SELECT "{x_col}", "{y_col}" FROM "{DATA}" WHERE {facet_predicate}'
        ).df()

        x_vals = df[x_col].tolist()
        y_vals = df[y_col].tolist()
        slope, intercept = compute_regression(x_vals, y_vals)

        facet_data[fval] = {
            'points': list(zip(x_vals, y_vals)),   # [[x, y], ...]
            'slope': slope,
            'intercept': intercept,
            'count': len(x_vals),
        }

    return jsonify({
        'facet_data': facet_data,
        'scatter_ranges': scatter_ranges,
        'x_col': x_col,
        'y_col': y_col,
    })


@app.route('/axis_range', methods=['POST'])
def axis_range():
    """Return global min/max for a given column (used when user changes axis dropdowns)."""
    col = request.get_json().get('col')
    if col not in axis_options:
        return jsonify({'error': 'invalid column'}), 400
    row = duckdb.sql(f'SELECT MIN("{col}"), MAX("{col}") FROM "{DATA}"').df().iloc[0]
    return jsonify({'min': float(row.iloc[0]), 'max': float(row.iloc[1])})


if __name__ == '__main__':
    app.run(debug=True)
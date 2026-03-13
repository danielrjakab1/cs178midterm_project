function build_scales(x_range, y_range){
    var x_scale = d3.scaleLinear()
        .domain([x_range[0], x_range[1]])
        .range([0, width])
        .nice();
    var y_scale = d3.scaleLinear()
        .domain([y_range[0], y_range[1]])
        .range([height, 0])
        .nice();
    return {x: x_scale, y: y_scale}
}
 
function draw_axes(svg, scale, i){
    svg.selectAll('.x-axis-' + i + ', .y-axis-' + i).remove();
    svg.append('g')
        .attr('class', 'x-axis-' + i)
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(scale.x).ticks(6).tickSize(-height));
    svg.append('g')
        .attr('class', 'y-axis-' + i)
        .call(d3.axisLeft(scale.y).ticks(6).tickSize(-width));
}
 
function draw_regression_line(svg, scale, slope, intercept, i, color){
    svg.selectAll('.reg-line-' + i).remove();
    if (slope === null || slope === undefined) return;
    var x0 = scale.x.domain()[0];
    var x1 = scale.x.domain()[1];
    svg.append('line')
        .attr('class', 'reg-line-' + i)
        .attr('x1', scale.x(x0))
        .attr('y1', scale.y(slope * x0 + intercept))
        .attr('x2', scale.x(x1))
        .attr('y2', scale.y(slope * x1 + intercept))
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.85);
}
 
function draw_scatter(i, svg, scale, points, slope, intercept){
    var palette = ['#3b82f6', '#f97316'];
    var color = palette[i % palette.length];
    svg.selectAll('circle').remove();
    svg.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', function(d){ return scale.x(d[0]); })
        .attr('cy', function(d){ return scale.y(d[1]); })
        .attr('r', 4)
        .attr('fill', color)
        .attr('opacity', 0.65)
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5);
    draw_regression_line(svg, scale, slope, intercept, i, color);
}
 
function get_params(){
    var params = {};
    params.x_col     = document.getElementById('x-select').value;
    params.y_col     = document.getElementById('y-select').value;
    params.facet_col = document.getElementById('facet-select').value;
    Object.keys(filter_ranges).forEach(function(col){
        var el = document.getElementById(col + '-slider');
        if (el && el.noUiSlider){
            params[col] = el.noUiSlider.get().map(Number);
        }
    });
    ['ExtracurricularActivities', 'PlacementTraining'].forEach(function(col){
        var checked = Array.from(document.querySelectorAll('.cb-' + col + ':checked')).map(function(cb){ return cb.value; });
        if (checked.length > 0) params[col] = checked;
    });
    return params;
}
 
function on_axis_change(){
    var x_col = document.getElementById('x-select').value;
    var y_col = document.getElementById('y-select').value;
    var fetches = [
        fetch('/axis_range', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({col: x_col})}).then(function(r){ return r.json(); }),
        fetch('/axis_range', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({col: y_col})}).then(function(r){ return r.json(); })
    ];
    Promise.all(fetches).then(function(results){
        scatter_ranges.x = [results[0].min, results[0].max];
        scatter_ranges.y = [results[1].min, results[1].max];
        [0, 1].forEach(function(i){
            scales[i] = build_scales(scatter_ranges.x, scatter_ranges.y);
            draw_axes(svgs[i], scales[i], i);
        });
        update();
    });
}
 
function update(){
    params = get_params();
    fetch('/update', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(params),
        cache: 'no-cache',
        headers: new Headers({'content-type': 'application/json'})
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())));
        var fvals    = results['fvals'];
        var facet_col = results['facet_col'];
        fvals.forEach(function(fval, i){
            var data = results['facet_data'][fval];
            scatter_ranges.x = results['scatter_ranges'].x;
            scatter_ranges.y = results['scatter_ranges'].y;
            scales[i] = build_scales(scatter_ranges.x, scatter_ranges.y);
            draw_axes(svgs[i], scales[i], i);
            draw_scatter(i, svgs[i], scales[i], data['points'], data['slope'], data['intercept']);
            document.getElementById('facet-label-' + i).textContent = facet_col + ': ' + fval;
        });
    });
}
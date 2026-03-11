function draw_svg(container_id, margin, width, height){
    svg = d3.select("#"+container_id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", "#dbdad7")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    return svg
}

function draw_xaxis(plot_name, svg, height, scale){
    svg.append("g")
        .attr('class', plot_name + "-xaxis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(scale).tickSize(0))
}

function draw_yaxis(plot_name, svg, scale){
    svg.append("g")
        .attr('class', plot_name + "-yaxis")
        .call(d3.axisLeft(scale));
}

function draw_axis(plot_name, axis, svg, height, domain, range, discrete){
    if (discrete){
        var scale = d3.scaleBand()
            .domain(domain)
            .range(range)
            .padding([0.2])
    } else {
        var scale = d3.scaleLinear()
            .domain(domain)
            .range(range);
    }
    if (axis=='x'){
        draw_xaxis(plot_name, svg, height, scale)
    } else if (axis=='y'){
        draw_yaxis(plot_name, svg, scale)
    }
    return scale
}

function draw_axes(plot_name, svg, width, height, domainx, domainy, x_discrete){
    var x_scale = draw_axis(plot_name, 'x', svg, height, domainx, [0, width], x_discrete)
    var y_scale = draw_axis(plot_name, 'y', svg, height, domainy, [height, 0], false)
    return {'x': x_scale, 'y': y_scale}
}

function draw_slider(column, min, max, scatter_svg, bar_svg, scatter_scale, bar_scale){
    slider = document.getElementById(column+'-slider')
    noUiSlider.create(slider, {
      start: [min, max],
      connect: false,
          tooltips: true,
      step: 1,
      range: {'min': min, 'max': max}
    });
    slider.noUiSlider.on('change', function(){
        update(scatter_svg, bar_svg, scatter_scale, bar_scale)
    });
}

// TODO: Write a function that draws the scatterplot
function draw_scatter(data, svg, scale){

}

// TODO: write a function that updates the bar
function draw_bar(data, svg, scale){

}

// TODO: Write a function that extracts the selected days and minimum/maximum values for each slider
function get_params(){
    var day = []
    var humidity = [0, 0]
    var temp = [0, 0]
    var wind = [0, 0]
    return {'day': day, 'humidity': humidity, 'temp': temp, 'wind': wind}
}

// TODO: Write a function that removes the old data points and redraws the scatterplot
function update_scatter(data, svg, scale){

    draw_scatter(data, svg, scale)
}

// TODO: Write a function that updates the y-axis, removes the old bars, and redraws the bars
function update_bar(data, max_count, svg, scale){

    draw_bar(data, svg, scale)
}

function update(scatter_svg, bar_svg, scatter_scale, bar_scale){
    params = get_params()
    fetch('/update', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(params),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())))
        update_scatter(results['scatter_data'], scatter_svg, scatter_scale)
        update_bar(results['bar_data'], results['max_count'], bar_svg, bar_scale)
    })
}
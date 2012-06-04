var vertices = [];
var cellIDCount = 0;

var MODE_ADD = 0;
var MODE_REMOVE = 1;
var MODE_COLOUR = 2;

var mode = MODE_ADD;

var colour;
var coloursUsed = [];

var svg = d3.select(".chart").append("svg")
    .on("mouseout", outHandler)
    .on("mousemove", moveHandler)
    .on("mousedown", clickHandler);

var cellsGroup = svg.append("g").attr("class", 'cells');
var pointsGroup = svg.append("g").attr("class", 'points');

function getPointFromId(id) {
    var gotPoint = null;

    vertices.forEach(function(point, i) {
        if (point[3] == id) {
            gotPoint = point;
        }
    });    

    return gotPoint;
}

function genID() {
    var id = "c"+cellIDCount
    cellIDCount++;
    return id;
}

function generateVoronoiPolys(vertices) {
    if (vertices && vertices.length > 1) {
        voronoiPolys = d3.geom.voronoi(vertices);
        return voronoiPolys;
    } else {
        return [];
    }
}

function moveHandler() {
    if (mode == MODE_ADD) {
        var point = d3.mouse(this);
        point.push(colour)
        var newPoint = addPoint(point, false);

        if (newPoint) {
            update();
            removePoint(newPoint);
        }
    }
}

function clickHandler() {
    switch (mode) {
        case MODE_ADD:
            var newPoint = d3.mouse(this);
            newPoint.push(colour);
            addPoint(newPoint);  
            break;
        case MODE_REMOVE:
            var id = d3.event.target.getAttribute('id');
            var point = getPointFromId(id);
            if (point) {
                removePoint(point);    
            }
            break;
        case MODE_COLOUR:
            var id = d3.event.target.getAttribute('id');
            var point = getPointFromId(id);
            if (point) {
                colourPoint(point, colour);
            }
            break;
    }
    
    update();
    updateRecentColours();
    updateSaveLinks();
    drawVertices();
}

function outHandler(e) {
    if (d3.event.toElement == null || ! jQuery.contains(svg[0][0], d3.event.toElement)) {
        update();       
    }
}


function addPoint(newPoint, saveId) {
    var exists = false;
    var saveId = (saveId != null) ? saveId : true;

    vertices.forEach(function(point, i) {
        if (point[0] == newPoint[0] && point[1] == newPoint[1]) {
            exists = true;
            return;
        }
    });

    if ( ! exists) {
        if (saveId) {
            newPoint.push(genID());    
        }
        
        vertices.push(newPoint);

        return newPoint;
    }

    return null;
}

function removePoint(point) {
    vertices.splice(vertices.indexOf(point), 1);
}

function colourPoint(point, colour) {
    point[2] = colour;
}

function update() {
    var voronoiPolys = generateVoronoiPolys(vertices);
    drawPolys(voronoiPolys);
}

function drawPolys(polys) {
    if (polys.length > 0) {
        var paths = cellsGroup.selectAll("path")
            .data(polys)
        
        paths.enter().append("path");
        paths.exit().remove();

        paths.data(polys).attr("d", function(d) { return "M" + d.join("L") + "Z"; })
            .attr("fill", function(d, i) { return vertices[i][2]; })
            .attr("id", function(d, i) { return vertices[i][3]; })
    }
}

function drawVertices() {
    if (vertices.length > 0) {
        var verticesPoints = [];
        vertices.forEach(function(point, i) {
            verticesPoints.push([
                point[0],
                point[1],
            ]);
        });

        var circles = pointsGroup.selectAll("circle")
            .data(verticesPoints)
        
        circles.enter().append("circle");
        circles.exit().remove();

        circles.data(verticesPoints)
            .attr("transform", function(d) { return "translate(" + d + ")"; })
            .attr("r", 2);    
    }    
}


function updateColoursUsed() {
    coloursUsed = [];
    vertices.forEach(function(point, i) {
        var newCol = point[2];
        if (newCol) {
            var colExists = false;
            coloursUsed.forEach(function(col) {
                if (col == newCol) {
                    colExists = true;
                    return;
                }
            });
            if ( ! colExists) {
                coloursUsed.push(newCol);
            }
        }
    });  
}


$recentColours = $('#recent-colours');

function updateRecentColours() {
    updateColoursUsed();

    $recentColours.empty();
    coloursUsed.forEach(function(col) {
        var swatch = $("<span></span>").attr({
            'data-colour': col,
            'class': 'swatch'
        }).css({
            'background-color': col
        });
        $recentColours.append(swatch)
    })
}

$recentColours.on("click", function(evt) {
    var col = $(evt.target).attr('data-colour');
    colourPicker.setColor(col);
})
$colourButton = $(".mode-controls .colour");

var colourPickerPlaceholder = '#colourpicker'
$(colourPickerPlaceholder).farbtastic(function(col){
    colour = col;
    $colourButton.css('color', col);
});
var colourPicker = $.farbtastic(colourPickerPlaceholder);
colourPicker.setColor("#000000");




var modeControls = document.getElementsByClassName("mode-controls")[0];
modeControls.addEventListener("change", function(evt) {
    switch (evt.target.value) {
        case "add":
            mode = MODE_ADD;
            break;
        case "remove":
            mode = MODE_REMOVE;
            break;
        case "colour":
            mode = MODE_COLOUR;
            break;
    }
});



var pointControl = $(".points-control input");
showPoints(pointControl.is(":checked"));
pointControl.on("change", function(evt) {
    showPoints($(evt.target).is(":checked"));
});


function showPoints(show) {
    if (show) {
        pointsGroup.attr('visibility', 'visible')
    } else {
        pointsGroup.attr('visibility', 'hidden')
    }
}




var $downloadLink = $("#save .download a");
var $saveLink = $("#save .editor a");

function updateSaveLinks() {
    $saveLink.attr('href', encodeForURL());

    $(".chart svg").attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});        
    var svg = $(".chart").html();
    var b64 = window.btoa(svg);
    $downloadLink.attr({
        'href-lang': 'image/svg+xml',
        'href': 'data:image/svg+xml;base64,\n' + b64
    });
}

newVertices = decodeFromURL();
if (newVertices) {
    vertices = newVertices;
    update();
    updateRecentColours();
    updateSaveLinks();
    drawVertices();
}


function encodeForURL() {
    updateColoursUsed();
    var saveColours = coloursUsed;
    var saveVertices = $.extend(true, [], vertices);
    saveVertices.forEach(function(point, i) {
        point[2] = saveColours.indexOf(point[2])
    });

    var verticesStringed = $.map(saveVertices, function(point, i) {
        return "x"+point[0] + "y"+point[1] + "c"+point[2]
    });

    var uri = new URI();
    uri.search({
        c: saveColours,
        v: verticesStringed
    });

    return uri.toString();
}

function decodeFromURL() {
    var uri = new URI();
    var params = uri.search(true);

    if (params['c'] && params['v']) {
        var savedColours = params['c'];
        var savedVertices = params['v'];
        savedVertices.forEach(function(pointString, i) {
            var re = /x(\d+)+y(\d+)c(\d+)/g;
            var result = re.exec(pointString);
            savedVertices[i] = [parseInt(result[1]), parseInt(result[2]), savedColours[parseInt(result[3])], genID()];
        });

        return savedVertices;
    }
}








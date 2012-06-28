var vertices = [];
var cellIDCount = 0;

var MODE_ADD = 0;
var MODE_REMOVE = 1;
var MODE_MOVE = 2;
var MODE_COLOUR = 3;
var MODE_INSPECT = 4;

var mode = MODE_ADD;

var colour;
var coloursUsed = [];
var pointToMove;
var inspectedPoint;

var svg = d3.select(".chart").append("svg")
    .on("mouseout", outHandler)
    .on("mousemove", moveHandler)
    .on("mousedown", mousedownHandler)
    .on("mouseup", mouseupHandler);

var cellsGroup = svg.append("g").attr("class", 'cells');
var pointsGroup = svg.append("g").attr("class", 'points');

var inspectSvg = d3.select(".inspect-dialog .shape").append("svg");
var $inspectSvg = $(inspectSvg[0][0]);

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
    switch (mode) {
        case MODE_ADD:
            var point = d3.mouse(this);
            point.push(colour)
            var newPoint = addPoint(point, false);

            if (newPoint) {
                update();
                removePoint(newPoint);
            }
            break;
        case MODE_MOVE:
            if (pointToMove) {
                var mousePoint = d3.mouse(this);
                pointToMove[0] = mousePoint[0];
                pointToMove[1] = mousePoint[1];
                update();
            }
            break;
    }
}

function mousedownHandler() {
    switch (mode) {
        case MODE_ADD:
            var point = d3.mouse(this);
            point.push(colour);
            newPoint = addPoint(point);  

            if (newPoint) {
                update();
                updateRecentColours();
                updateSaveLinks();                
            }
            break;

        case MODE_REMOVE:
            var point = getPoint();
            if (point) {
                removePoint(point);  

                update();
                updateRecentColours();
                updateSaveLinks();                
            }
            break;

        case MODE_MOVE:
            var point = getPoint();
            if (point) {
                startMovingPoint(point);
            }
            break;   

        case MODE_COLOUR:
            var point = getPoint();
            if (point) {
                colourPoint(point, colour);

                update();
                updateRecentColours();
                updateSaveLinks();                
            }
            break;

        case MODE_INSPECT:
            var point = getPoint();
            if (point) {
                inspectPoint(point);
            }
            break;
    }

    function getPoint() {
        var id = d3.event.target.getAttribute('id');
        return getPointFromId(id);
    }
}

function mouseupHandler() {
    stopMovingPoint();   
    updateSaveLinks();
}

function outHandler(e) {
    if (d3.event.toElement == null || ! jQuery.contains(svg[0][0], d3.event.toElement)) {
        if (mode == MODE_ADD) {
            update();
        }
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

function startMovingPoint(point) {
    pointToMove = point;
}

function stopMovingPoint() {
    pointToMove = null;
}

function colourPoint(point, colour) {
    point[2] = colour;
}

function inspectPoint(point) {
    uninspectPoint();
    var path = $("#"+point[3]).eq(0);
    path.attr('class', 'inspect');
    var parent = path.parent();
    parent.append(path);
    inspectedPoint = point;

    var margin = 60;

    var points = getPointsFromPathString(path.attr("d"));
    var box = [
        [margin, margin],
        [$inspectSvg.width() - margin, $inspectSvg.height() - margin]
    ];
    var inspectPoints = fitPointsToBox(points, box);

    var d = "M";
    inspectPoints.forEach(function(point, i) {
        if (i != 0) {
            d += "L";    
        }
        d += point[0] + "," + point[1]
    });
    d += "Z";

    $inspectSvg.empty();
    inspectSvg.append("path").attr('d', d);


    var lines = [];
    points.forEach(function(point, i) {
        var j = (i < points.length - 1) ? i + 1 : 0;
        lines.push([{
                x: points[i][0],
                y: points[i][1]
            },{
                x: points[j][0],
                y: points[j][1]
        }]);
    });

    var measurements = [];
    lines.forEach(function(line, i) {
        var j = (i < lines.length - 1) ? i + 1 : 0;
        measurements.push({
            len: Math.sqrt(Math.pow(line[1].x - line[0].x, 2) + Math.pow(line[1].y - line[0].y, 2)),
            angle: 180 - ((180/Math.PI) * angleBetweenTwoLines(lines[i], lines[j]))
        })
    });

    function angleBetweenTwoLines(line1, line2) {
        var x1 = line1[0].x - line1[1].x;
        var y1 = line1[0].y - line1[1].y;
        var x2 = line2[0].x - line2[1].x;
        var y2 = line2[0].y - line2[1].y;

        return Math.acos(
                (x1 * x2 + y1 * y2) / 
                ( Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2)) * Math.sqrt(Math.pow(x2, 2) + Math.pow(y2, 2)))
            );
    }

    $data = $(".inspect-dialog .data").empty();
    $ol = $("<ol></ol>");
    measurements.forEach(function(m, i) {
        $ul = $("<ul></ul>");
        $ul.append('<li>Length: '+m.len+'</li>');
        $ul.append('<li>Angle: '+m.angle+'&deg;</li>');
        $data.append($ul);    
    });
    $data.append($ol);
    $(".inspect-dialog").removeClass('hidden');
}

function uninspectPoint() {
    if (inspectedPoint) {
        var path = $("#"+inspectedPoint[3]).eq(0);
        path.attr('class', '');    
        inspectedPoint = null;
    }
    $(".inspect-dialog").addClass('hidden');
}

function getPointsFromPathString(pathString) {
    var points = pathString.slice(1, -1);
    var points = points.split('L');
    points.forEach(function(item, i) {
        points[i] = item.split(',');
        points[i][0] = parseInt(points[i][0]);
        points[i][1] = parseInt(points[i][1]);
    });

    return points;
}

function fitPointsToBox(points, box) {
    
    var boundingBox = getBoundingBox(points);
    var newPoints = [];

    // Scale
    var width = boundingBox[1][0] - boundingBox[0][0];
    var height = boundingBox[1][1] - boundingBox[0][1];
    var scale;
    if (width > height) {
        scale = (box[1][0] - box[0][0]) / width;
    } else {
        scale = (box[1][1] - box[0][1]) / height;
    }
    points.forEach(function(point, i) {
        newPoints[i] = [point[0] * scale, point[1] * scale];
    });


    // Move
    boundingBox = getBoundingBox(newPoints);
    var moveX = box[0][0] - boundingBox[0][0];
    var moveY = box[0][1] - boundingBox[0][1];

    newPoints.forEach(function(point, i) {
        newPoints[i] = [point[0] + moveX, point[1] + moveY];
    });

    return newPoints;
}


function getBoundingBox(points) {
    var xMin, xMax, yMin, yMax;

    points.forEach(function(point) {
        xMin = xMin ? Math.min(point[0], xMin) : point[0];
        xMax = xMax ? Math.max(point[0], xMax) : point[0];
        yMin = yMin ? Math.min(point[1], yMin) : point[1];
        yMax = yMax ? Math.max(point[1], yMax) : point[1];
    });

    return [
        [xMin, yMin],
        [xMax, yMax]
    ];
}



function update() {
    var voronoiPolys = generateVoronoiPolys(vertices);
    drawPolys(voronoiPolys);
    drawVertices();
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



var $modeControls = $(".mode-controls");
$modeControls.on("change", function(evt) {
    $modeControls.find('label').removeClass('checked');
    $(evt.target).parent().addClass('checked');
    switch (evt.target.value) {
        case "add":
            mode = MODE_ADD;
            break;
        case "remove":
            mode = MODE_REMOVE;
            break;
        case "move":
            mode = MODE_MOVE;
            break;            
        case "colour":
            mode = MODE_COLOUR;
            break;
        case "inspect":
            mode = MODE_INSPECT;
            break;
    }

    uninspectPoint();
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
    updateSaveLinks();
}




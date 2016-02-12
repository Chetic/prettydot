    var m = [20, 120, 20, 120],
        w = 1280 - m[1] - m[3],
        h = 800 - m[0] - m[2],
        i = 0, j = 0,
        root;

    var tree = d3.layout.tree()
        .size([h, w]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var vis = d3.select("#body").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    Array.prototype.contains = function(v) {
        for(var i = 0; i < this.length; i++) {
            if(this[i] === v) return true;
        }
        return false;
    };

    Array.prototype.unique = function() {
        var arr = [];
        for(var i = 0; i < this.length; i++) {
            if(!arr.contains(this[i])) {
                arr.push(this[i]);
            }
        }
        return arr;
    };

    $.get( "example.dot", function( data ) {
        var graph = graphlibDot.read(data);

        root = {"name": graph.nodes()[0], "children": []};
        root.x0 = h / 2;
        root.y0 = 0;
        $("#footer").prepend(root.name);

        // Gather all unique 'from'-nodes to figure out the number of trees
        varr = [];
        for (j = 0; j < graph.edges().length; j++) {
            varr.push(graph.edges()[j].v);
        }
        rootnodes = varr.unique();
        // --------------------------

        for (i = 0; i < graph.nodes().length; i++) {
            var nodeName = graph.nodes()[i];
            var node = findNode(nodeName, root);
            if (node == false) {
                node = {"name": nodeName, "children": []};
            }

            for (j = 0; j < graph.edges().length; j++) {
                if (graph.edges()[j].v == nodeName && graph.edges()[j].v != graph.edges()[j].w) {
                    var childName = graph.edges()[j].w;
                    var child = findNode(childName, root);
                    if (child == false) {
                        child = {"name": childName, "children": []};
                        node.children.push(child);
                    }
                    else {
                        //if an edge specifies a relationship from this node to a node already in graph,
                        //the tree becomes a directed graph
                    }
                }
            }
            $("body").append(nodeName + "<br/>");
        }
        update(root);

        $("body").append("<br/>");
        for (i = 0; i < graph.edges().length; i++) {
            var strgraph = "";
            strgraph += graph.edges()[i].v + '->' + graph.edges()[i].w;
            strgraph += " (color: " + graph.edge(graph.edges()[i]).color + ")";
            if (graph.edge(graph.edges()[i]).hasOwnProperty("label")) {
                strgraph += " (label: " + graph.edge(graph.edges()[i]).label + ")";
            }
            $("body").append(strgraph + "<br/>");
        }
    });

    function findNode(name, currentNode) {
        var i,
            currentChild,
            result;

        if (name == currentNode.name) {
            return currentNode;
        } else {

            // Use a for loop instead of forEach to avoid nested functions
            // Otherwise "return" will not work properly
            for (i = 0; i < currentNode.children.length; i += 1) {
                currentChild = currentNode.children[i];

                // Search in the current child
                result = findNode(name, currentChild);

                // Return the result if the node has been found
                if (result !== false) {
                    return result;
                }
            }

            // The node has not been found and we have no more options
            return false;
        }
    }

    function update(source) {
        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = vis.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", function(d) { toggle(d); update(d); });

        nodeEnter.append("svg:circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("svg:text")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = vis.selectAll("path.link")
            .data(tree.links(nodes), function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children.
    function toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }

    function reloadGraph() {
        root.name = $("txtDebugInput").text;
        update(root);
    }

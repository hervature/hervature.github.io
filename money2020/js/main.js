var merchant_id = null;
var employee_id = null;
var client_id = null;
var access_token = null;
var client_secret = "6c7c21d7-542b-8817-bfc1-7f2661692037";
var amount = 0;
var payment_token = "AXE6V6W7X4DRJ";

$( document ).ready(function() {
    var urlParams = new URLSearchParams(window.location.search + window.location.hash.replace("#", "&"));

    merchant_id = urlParams.get("merchant_id");
	employee_id = urlParams.get("employee_id");
	client_id = urlParams.get("client_id");
	access_token = urlParams.get("access_token");

	draw_menu();

	$("footer").click(function() {
		$('#signup_modal').modal()
	});

	$("#pay_button").click(function() {
		process_payment();

		$(this).parent().html('<img class="spinning" src="svg/reload.svg">');
	});
});

function draw_menu() {
	$("#main").empty();
	$("#main").html('<div id="accordion" role="tablist"></div>');
	make_categories();
}

function make_categories() {

	url = "https://apisandbox.dev.clover.com/v3/merchants/" + merchant_id + "/categories?access_token=" + access_token;

	$.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
        	var categories = data.elements;

        	for (i = 0; i < categories.length; i++) {
        		$( "#accordion" ).append(
        			'<div class="card m-2" id="category-' + categories[i].id + '">\
        				<a data-toggle="collapse" href="#collapse-' + categories[i].id + '">\
		        			<div class="card-header" role="tab" class="category">\
		        				<h5 class="mb-0">'
							        + get_category_icon(categories[i].name) + ' ' + categories[i].name +
		        				'</h5>\
		        			</div>\
		        		</a>\
	        		</div>');
        		make_items(categories[i].id);
        	}
        }
    });

}

function get_category_icon(category) {
	if (category === "Beers") {
		return "🍺";
	} else if (category === "Cocktails") {
		return "🍸";
	} else {
		return "🍷";
	}
}

function make_items(category_id) {

	url = "https://apisandbox.dev.clover.com/v3/merchants/" + merchant_id + "/categories/" + category_id + "/items?access_token=" + access_token;

	$.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
        	var items = data.elements;

    		$( "#category-" + category_id ).append(
    			'<div id="collapse-' + category_id + '" class="collapse" role="tabpanel" data-parent="#accordion">\
    				<div class="card-body container">');

    		for (i = 0; i < items.length; i++) {
    			$( "#category-" + category_id + " .card-body" ).append(
    					'<div id="item-' + items[i].id + '" class="item row mb-1">\
    						<div class="col-5"><span class="name">' + items[i].name + '</span></div>\
    						<div class="col-3">$' + (items[i].price/100).toFixed(2) + '</div>\
    						<div class="col-4">\
	    						<div class="input-group">\
						          <span class="minus input-group-addon">\
						              <img src="svg/minus.svg">\
						          </span>\
						          <input type="number" class="form-control" value="0" min="0" max="10">\
						          <span class="plus input-group-addon">\
					                  <img src="svg/plus.svg">\
						          </span>\
					          	</div>\
					      	</div>\
							<span class="d-none code">' + items[i].code + '</span>\
    					</div>'
				);
			}

			$( "#category-" + category_id ).append(
			      	'</div>\
			     </div>'
			);

			$("#category-" + category_id + " .plus").click(function() {
				var num = parseInt($(this).siblings("input").val());

				if (num < 10) {
					num = num + 1;

					var cost = $(this).parent().parent().prev().text();
					cost = cost.substr(1);

					amount = amount + parseFloat(cost);

					$("#total").text(amount.toFixed(2));
				}
				else {
					num = 10;
				}

				$(this).siblings("input").val(num);
			});

			$("#category-" + category_id + " .minus").click(function() {
				num = parseInt($(this).siblings("input").val());

				if (num > 0) {
					num = num - 1;

					var cost = $(this).parent().parent().prev().text();
					cost = cost.substr(1);

					amount = amount - parseFloat(cost);

					$("#total").text(amount.toFixed(2));
				}
				else {
					num = 0;
				}

				$(this).siblings("input").val(num);
			});
        }
    });
}

function add_line_items(order_id, items) {
	url = "https://apisandbox.dev.clover.com/v3/merchants/" + merchant_id + "/orders/" + order_id + "/line_items?access_token=" + access_token;

	for (item of items) {
		$.ajax({
	        url: url,
	        type: 'POST',
	        data: JSON.stringify({ "item": {"id": item.id, "quantitySold": item.quantity }}),
    		dataType: 'json'
	    });
	}
}

function process_payment() {
	var items = [];

	$(".item").each( function() {
		var id = $(this).attr("id").substr(5);
		var quantity = $(this).find("input").val();
		var name = $(this).children().find(".name").text();
		var cost = parseFloat($(this).children().eq(1).text().substr(1))*100;
		var code = $(this).find(".code").text();

		if(quantity > 0) {
			items.push({id: id, quantity: quantity, name: name, cost: cost, code: code});
		}
	});

	url = "https://apisandbox.dev.clover.com/v3/merchants/" + merchant_id + "/orders?access_token=" + access_token;

	if (items.length > 0) {
		var order;
		var exponent;
		var modulus;
		var prefix;
		var payload;
		var encrypted_card;

		$.ajax({
	        url: url,
	        type: 'POST',
	        data: JSON.stringify({"state": "on", "total": amount*100}),
	        success: function(data) {
	        	order = data;
	        	add_line_items(order.id, items);
	        }
	    }).done( function() {
			url = "https://apisandbox.dev.clover.com/v2/merchant/" + merchant_id + "/pay/key?access_token=" + access_token;

	    	payload = {
				"orderId": order.id,
				"taxAmount": 0,
				"expMonth": 12,
				"cvv": "123",
				"amount": amount*100,
				"expYear": 2018,
				// "cardNumber": "4761739001010010",
				"cardNumber": "6011361000006668"
			};

	    	$.ajax({
		        url: url,
		        type: 'GET',
		        data: JSON.stringify(payload),
		        success: function(data) {
					modulus = data.modulus;
					exponent = data.exponent;
					prefix = data.prefix;
		        }
		    }).done( function() {
		    	url = "https://bluwave.herokuapp.com/api/orders/generate_card_encryption?prefix=" + prefix + "&card=" + payload.cardNumber + "&exponent=" + exponent + "&modulus=" + modulus

		    	$.ajax({
			        url: url,
			        type: 'GET',
			        success: function(data) {
						encrypted_card = data.encryption
			        }
			    }).done( function() {
	    			url = "https://apisandbox.dev.clover.com/v2/merchant/" + merchant_id + "/pay?access_token=" + access_token;

	    			payload = {
					    "orderId": order.id,
					    "currency": "usd",
					    "taxAmount": 0,
						"expMonth": 12,
						"cvv": "111",
						"amount": amount*100,
						"expYear": 2018,
					    "cardEncrypted": encrypted_card,
					    "last4": "0010",
					    "first6": "476173"
					};

	    			$.ajax({
				        url: url,
				        type: 'POST',
				        data: JSON.stringify(payload),
				        success: function(data) {

							if (data.result == "APPROVED") {

								url = "https://bluwave.herokuapp.com/api/orders.json";

								codes = [];

								for (item of items) {
									codes.push(item.code);
								}

								payload = {
									"person_id": 1,
									"item_ids": codes
								};

								$.ajax({
							        url: url,
							        type: 'POST',
							        data: payload,
							        success: function(data) {
										$('#signup_modal').modal('hide');
										draw_order(items);
							        }
							    });
							}
				        }
				    });
			    });
		    });
	    });
	}
}

function draw_order(items) {
	$("#main").empty();

	$("#main").append('<div id="processing"></div>')

	$("#processing").append(
		'<h3>Processing order</h3><ul id="order_list" class="dashed"></ul>'
	);

	for (item of items) {
		if (item.quantity > 1) {
			$("#order_list").append(
				'<li>' + item.name + ' x' + item.quantity + '</li>'
			);
		}
		else {
			$("#order_list").append(
				'<li>' + item.name + '</li>'
			);
		}
	}

	$("#processing").append(
			'<p class="callout">Watch out for a notification to come and grab your drink.</p>'
	);

	$("#processing").append(
		'<img src="http://cdnjs.cloudflare.com/ajax/libs/twemoji/2.2.5/2/svg/1f37b.svg" class="cheers"></img>');
}



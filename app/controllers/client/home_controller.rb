class Client::HomeController < ApplicationController
	layout 'client'

	def index

		@products_slider_principal = Product.aviso_vip_slider_principal.list_store # aviso vip slider principal
		@offers = Product.oferta_del_momento.list_store # ofertas del momento
		@destacado = Product.aviso_destacado.list_store # ofertas del momento
		@events = Event.all.vigente
		@products = Product.aviso_standar.list_store # todos los productos standar

		@order_item = current_order&.order_items&.new
	end

	def ofertas
		@products = Product.oferta_del_momento.list_store # ofertas del momento
		@order_item = current_order&.order_items.new
	end

	def destacados
		@products = Product.aviso_destacado.list_store # ofertas del momento
		@order_item = current_order&.order_items.new
	end

	def cercanos
		@products = Product.aviso_standar.list_store # todos los productos standar
		@order_item = current_order&.order_items.new
	end

	def politica
		pdf_filename = File.join(Rails.root, "public/politicas.pdf")
  		send_file(pdf_filename, :filename => "politicas.pdf", :disposition => 'inline', :type => "application/pdf")
	end

	def mapa
		if params[:categoria].present?
			@stores = Store.where(kind: params[:categoria])
		else
			@stores = Store.all
		end

		unless @stores.count < 0
			@hash = Gmaps4rails.build_markers(@stores) do |store, marker|
				marker.lat store.latitude
				marker.lng store.longitude
				marker.infowindow "
					<div style='height: 120px; width: 400px;  ' >
						<div class='container-fluid'>
							<div class='row'>
								<div style='width: 30%; height: 100%; float: left' >
									<img src='assets/store.jpg' width='100%' />
								</div>
								<div style='width: 70%; height: 100%; float: left; padding-left: 10px; color: #000' >
									<div class='media-body text-left' style='width: 280px; padding-top: 2px;'>
										<h4 class='media-heading KR' style='text-transform:uppercase'>
											#{store.name}
										</h4>
										<h5 class='media-heading KL'>
											#{store.kind.titleize}
										</h5>
										<p class='media-heading KL'>
											#{store.phone}
										</p>
										<p class='media-heading KL'></p>
										<h5 class='media-heading KL'>
											#{store.address.titleize}
										</h5>
										<a href='/tienda/#{store.id}' class='media-heading KL' style='color:blue'>
											Mas info
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				"
				marker.picture({
			        "url": "assets/marcador.png",
			        "width":  40,
			        "height": 60
			    })
			    marker.json({
			    	title: store.name
		    	})

			end
		end
	end

	def tiendas
		@stores = Store.all
	end

	def busqueda
		if params[:search].present?
			@products = Product.where("lower(name) like ? or lower(description) like ?", "%#{params[:search][:q].downcase}%","%#{params[:search][:q].downcase}%")
			@order_item = OrderItem.new
		else
			@products = []
		end
	end

	def aprobar_orden
		@order = Order.find(params[:id])
		@order.order_status_id = 3
		@order.user_id = current_user.id
		@order.save
		session[:order_id] = nil
		redirect_to orden_path(id: @order.id), :alert => "Orden verificada con exito, Por favor muestre su Codigo QR en la esntrada de su establecimiento"
	end

	def show_tienda
		@store = Store.find(params[:id])
		@order_item = current_order&.order_items.new
		get_location(@store.id)
	end

	def ordenes
		if user_signed_in?
			@orders = current_user ? current_user.orders : Order.where(id: current_order.id)
		else
			redirect_back fallback_location: new_user_session_path
		end
	end

	def orden
		if user_signed_in?
	  		@order = Order.find(params[:id])
	 		if @order.payment_id.present?
				if @order.payment_id.length == 12
		  		api    = Khipu::PaymentsApi.new()
					status = api.payments_id_get(@order.payment_id)
					@payment_status = status
				end
	 		end
	 	else
	 		redirect_to root_path
	 	end
	end

	def cancelar_orden
		@order = Order.find(params[:id])
		@order.order_status_id = 5
		@order.save
		redirect_back fallback_location: root_path
	end

	def eventos
		@events = Event.all.vigente
	end

	def show_evento
		@event = Event.find(params[:id])
		@order_item = current_order&.order_items.new
		get_location_event(@event)
		@store = @event.store
		@products = @event.products.active
		@tickets = @event.tickets.active.vigente
	end

	def show_producto
		@product = Product.find(params[:id])
		@order_item = current_order&.order_items.new
		@store = @product.item
		get_location(@product.item.id)
	end

	def detalle_producto
		@product = Product.find(params[:id])
	end

	def calificar_producto

		if user_signed_in?
			current_user.comments.create!(
				product_id: params[:id],
				comment: params[:post][:body]
			)

			redirect_to :root
		else
			redirect_to new_user_session_path
		end

	end

	def promociones
		@products = Product.promocion
		@order_item = current_order&.order_items.new
	end

	def show_promocion
		@store = Store.find(params[:id])
	end

	def search_category
		@stores = Store.where(kind: params[:id])
		render :tiendas
	end

	def videos
		@videos = Video.all
	end

	private
		def get_location(store_id)

			locations = Store.where(id: store_id)

			@hash = Gmaps4rails.build_markers(locations) do |store, marker|
				marker.lat store.latitude
				marker.lng store.longitude
				# marker.infowindow store.name
				marker.picture({
			        "url": "../assets/marcador.png",
			        "width":  40,
			        "height": 60
			    })
			end
		end

		def get_location_event(event)

			locations = event
			@hash = Gmaps4rails.build_markers(locations) do |event, marker|
				marker.lat event.latitude
				marker.lng event.longitude
				# marker.infowindow event.name
				marker.picture({
			        "url": "../assets/marcador.png",
			        "width":  40,
			        "height": 60
			    })
			end
		end
end

Rails.application.routes.draw do
  post '/rate' => 'rater#create', :as => 'rate'
	root 'client/home#index'

	#Action Cable Route
	mount ActionCable.server => '/cable'


scope module: 'client' do
	#payments routes	
  get 'one_click/init_inscription'
  post 'one_click/finish_inscription'
  get 'one_click/remove_user'
  get 'one_click/authorize'
  get 'one_click/reverse'
  get 'webpay/init_transaction'
  post 'webpay/return'
  post 'webpay/final'
  get 'webpay/nulify'
	get 'payments/create'
	get 'payments/bank_list'
	get 'payments/status'
	get 'payments/confirm'
	post 'chat_rooms/notify', to: 'chat_rooms#notify', as: 'notify'

	resources :chat_rooms, only: [:new, :create, :show, :index]
	resources :cart, controller: :carts, only: [:index, :show]
	resources :order_items, only: [:create, :update, :destroy]

	get '/ofertas',to: 'home#ofertas'
	get '/destacados', to: 'home#destacados'
	get '/cercanos', to: 'home#cercanos'
	get '/busqueda', to: 'home#busqueda'
	get '/contacto', to: 'home#contact'
	get '/mapa', to: 'home#mapa'
	get '/politica_de_privacidad', to: 'home#politica_privacidad'
	get '/politica', to: 'home#politica'
	get '/tiendas', to: 'home#tiendas'
	get '/eventos', to: 'home#eventos'
	get '/promociones', to: 'home#promociones'
	get '/ordenes', to: 'home#ordenes'
	get '/aprobar_orden', to: 'home#aprobar_orden'
	put '/modify_quantity', to: 'order_items#modify_quantity'
  get '/orden/:id', to: 'home#orden', as: 'orden'
  delete '/cancelar_orden/:id', to: 'home#cancelar_orden', as: 'cancelar_orden'
  get '/tienda/:id', to: 'home#show_tienda', as: 'tienda'
  get '/producto/:id', to: 'home#show_producto', as: 'producto'
  get '/producto/:id/calificar', to: 'home#detalle_producto', as: 'calificacion'
  post '/producto/:id/calificar', to: 'home#calificar_producto', as: 'calificar'
  get '/evento/:id', to: 'home#show_evento', as: 'evento'
  get '/promocion/:id', to: 'home#show_promocion', as: 'promocion'
  get '/categoria/:id', to: 'home#search_category', as: 'search_category'
  put '/add_address', to: 'payments#add_address'

	#Favorites Routes
	get '/favoritos', to: 'favorites#index', as: 'favoritos'
	put '/agregar_favoritos', to: 'favorites#create', as: 'agregar_favorito'
	delete '/eliminar_favoritos', to: 'favorites#destroy', as: 'eliminar_favorito'
end
	

	# Admin Routes
	namespace 'admin' do
		get 'index', to: 'home#index'
		
		#resources :stores
    resources :videos
    resources :streaming, only: :index
		get '/accept_store/:id', to: 'stores#accept_store', as: 'accept_store'
		get '/delete_store/:id', to: 'stores#delete_store', as: 'delete_store'

		get '/products_list', to: 'products#products_list', as: 'products_list'
    get '/stores_list', to: 'events#stores_list', as: 'stores_list'
		
		resources :users, :images, :products, :stores, :orders

		resources :events do
			resources :tickets
		end

	end

	#Api endpoints
	namespace 'api' do
		namespace 'v1' do
			put '/orders/validate_order', to: 'orders#validate_order', as: 'validate_order'
			get '/users/:id/products', to: 'users#products', as: 'user_products'
			post 'authenticate', to: 'authentication#authenticate'
      get 'rrpp_events', to: 'events#rrpp_events'
      post 'upload_video', to: 'events#upload_video'
      get 'get_videos', to: 'events#get_videos'
      get 'event_products/:id', to: 'events#event_products'
      post 'add_products_event', to: 'events#add_products_event'
			resources :order_items
			resources :products
			resources :stores
			resources :orders
			resources :images
			resources :users
			resources :events
      resources :guests
  		resources :tickets
		end
	end

	devise_for :users, :controllers => { :omniauth_callbacks => "users/omniauth_callbacks" }

end

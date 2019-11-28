class Admin::EventsController < ApplicationController
  before_action :set_event, only: [:show, :edit, :update, :destroy]
  before_action :check_permission

  # GET /events
  # GET /events.json
  def index
    if current_user.has_role? :admin
      @events = Event.all
    else
      @events = current_user.events
    end
  end

  # GET /events/1
  # GET /events/1.json
  def show
    @products = @event.products
  end

  # GET /events/new
  def new
    @event = Event.new
    @event.products.build
    @event.tickets.build
    if current_user.has_role? :admin
      @products = Product.where(item_type: "Store")
    else
      @products = current_user.products
    end
    
    puts "Productos: #{@event.products.inspect}"
  end

  # GET /events/1/edit
  def edit
    1.times{ @event.tickets.build }
    1.times{ @event.products.build }
    @products = @event.products
  end

  # POST /events
  # POST /events.json
  def create
    @event = Event.new(event_params)
    respond_to do |format|
      if @event.save
        add_images
        format.html { redirect_to admin_events_path, notice: 'Event was successfully created.' }
        format.json { render :show, status: :created, location: @event }
      else
        format.html { render :new }
        format.json { render json: @event.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /events/1
  # PATCH/PUT /events/1.json
  def update
    @event = Event.find(params[:id])
    respond_to do |format|
      if @event.update(event_params)
        add_images
        format.html { redirect_to admin_event_path(@event), notice: 'Event was successfully updated.' }
        format.json { render :show, status: :ok, location: @event }
      else
        format.html { render :edit }
        format.json { render json: @event.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /events/1
  # DELETE /events/1.json
  def destroy
    @event.destroy
    respond_to do |format|
      format.html { redirect_to admin_events_path, notice: 'Event was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  def stores_list
    @user = User.find_by(id: params[:user_id])
    @stores = @user.stores
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_event
      @event = Event.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def event_params
      params.require(:event).permit(:store_id, :user_id, :priority, :name, :category, :description, :start_datetime, :end_datetime, :video_link, :address,
        products_attributes: [:id, :name, :price, :stock, :priority, :active, :user_id, :_destroy, :description, :category, :start_datetime, :end_datetime, :image, :item_id, :item_type],
        tickets_attributes: [:id, :price, :name, :stock, :active, :start_date, :end_date, :_destroy]
      )
    end

    def add_images
      params[:event][:images].each { |cover| @event.images.create(cover: cover)} if params[:event][:images].present?
    end

    def add_products
      if params[:event][:product_ids].present?
        params[:event][:product_ids].split(',').each do |product|
          params[:product_stk].split(',').each do |stock|
            prod = Product.find(product)
            prod.update(item_id: @event.id, item_type: 'Event', stock_event: stock)
          end
        end
      end
    end

end

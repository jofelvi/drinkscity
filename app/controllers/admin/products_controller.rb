class Admin::ProductsController < ApplicationController
  before_action :set_product, only: [:show, :edit, :update, :destroy]
  before_action :check_permission
  before_action :list_stores, only: [:new, :edit, :update, :show, :create]

  # GET /products
  # GET /products.json
  def index
    if current_user.admin?
      @products = params[:store_id] ? Product.where(item_type: 'Store', item_id: params[:store_id]) : Product.all
    else
      @products = params[:store_id] ? Product.where(item_type: 'Store', item_id: params[:store_id]) : current_user.products
    end

    palabra = "%#{params[:search]}%"

    @products = Product.where("name LIKE ? OR description LIKE ?", palabra, palabra)
  end

  # GET /products/1
  # GET /products/1.json
  def show
  end

  # GET /products/new
  def new
    @product = Product.new    
  end

  # GET /products/1/edit
  def edit
  end

  # POST /products
  # POST /products.json
  def create
    @product = Product.new(product_params)
    @product.user = current_user

    respond_to do |format|
      if @product.save
        format.html { redirect_to admin_products_path, notice: 'Product was successfully created.' }
        format.json { render :show, status: :created, location: @product }
      else
        format.html { render :new }
        format.json { render json: @product.errors, status: :unprocessable_entity }
      end
    end
  rescue StandardError => e
    Airbrake.notify(e)
  end

  # PATCH/PUT /products/1
  # PATCH/PUT /products/1.json
  def update
    respond_to do |format|
      if @product.update(product_params)
        format.html { redirect_to admin_products_path, notice: 'Product was successfully updated.' }
        format.json { render :show, status: :ok, location: @product }
      else
        format.html { render :edit }
        format.json { render json: @product.errors, status: :unprocessable_entity }
      end
    end
  rescue StandardError => e
    Airbrake.notify(e)
  end

  # DELETE /products/1
  # DELETE /products/1.json
  def destroy
    @product.destroy
    respond_to do |format|
      format.html { redirect_to admin_products_path, notice: 'Product was successfully destroyed.' }
      format.json { head :no_content }
    end
  rescue StandardError => e
    Airbrake.notify(e)
  end

  def products_list
    @products = Product.where(item_id: params[:store_id])
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_product
      @product = Product.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def product_params
      params.require(:product).permit(:item_id, :image, :item_type, :user_id, :name, :price, :active, :category, :priority, :description, :start_datetime, :end_datetime, :stock, :sale_or_show)
    end

    def add_images
      if params[:product][:images].present?
        params[:product][:images].each { |cover|
          @product.images.create(cover: cover)
        }
      end
    end

    def list_stores
      if current_user.admin?
        @stores = Store.all.map {|key| [  key.name, key.id]}
      else
        @stores = current_user.stores.map {|key| [  key.name, key.id]}
      end      
    end
end

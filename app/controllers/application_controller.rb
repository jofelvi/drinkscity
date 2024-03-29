class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception, unless: :json_request
  helper_method :current_order
  before_action :set_new_user
  before_action :configure_permitted_parameters, if: :devise_controller?

  def after_sign_in_path_for(resource)
    if params[:user].present?
      if params[:user][:cart].present?
        cart_index_path
      else
        if current_user.role == 'admin' || current_user.role == 'store_admin'
          admin_index_path
        else
          root_path
        end
      end
    else
      root_path
    end
  end

  def set_new_user
    @user = User.new
  end

  def current_order
    if !session[:order_id].nil?
      Order.find(session[:order_id])
    else
      Order.new
    end
  end

  def check_permission
    if current_user.present?
      if current_user.admin? || current_user.store_admin?
        return
      else
        redirect_back(fallback_location: root_path)
      end
    else
      authenticate_user!
    end
  end

  protected

  def json_request
    request.format.json?
  end

  def configure_permitted_parameters
      devise_parameter_sanitizer.permit(:sign_up) { |u| u.permit(:fullname, :rut, :address, :phone, :email, :password, :avatar, :uid, :provider) }
      devise_parameter_sanitizer.permit(:account_update) { |u| u.permit(:fullname, :rut, :address, :phone, :email, :password, :current_password, :avatar, :uid, :provider) }
  end

end

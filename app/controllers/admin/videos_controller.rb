class Admin::VideosController < ApplicationController
  before_action :check_permission

  def index
    @videos = Video.all
  end

  
end

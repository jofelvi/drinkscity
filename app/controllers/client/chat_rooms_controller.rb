class Client::ChatRoomsController < ApplicationController
  layout 'client'
  before_action :authenticate_user!
  
  def index
    #redirect_to root_path unless current_user.admin?
    #@chat_rooms = ChatRoom.all
    redirect_to root_path
  end

  def show
    #@chat_room = ChatRoom.includes(:messages).find_by(id: params[:id])
    #@chat_room = current_user.chat_rooms.create(id: params[:id]) unless @chat_room
    
    #unless current_user.admin?
    #  unless current_user.id == @chat_room.id
    #    redirect_to root_path
    #  end
    #end
    #@message = Message.new
    #@notify = session[:notify]
    redirect_to root_path
  end

  def notify
    @chat_room = ChatRoom.find(params[:id])
    ChatMailer.notify(@chat_room).deliver_now
    session[:notify] = true

  end
  private

  def chat_room_params
    params.require(:chat_room).permit(:title)
  end

end
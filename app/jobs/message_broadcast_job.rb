class MessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(message)
    ActionCable.server.broadcast "chat_rooms_#{message.chat_room.id}_channel",
                                 message: render_message(message)
  end

  private

  def render_message(message)
    Client::MessagesController.render partial: 'client/messages/message', locals: {message: message}
  end
end
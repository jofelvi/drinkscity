module ApplicationHelper

	def disabled
		if action_name == "show"
			return true
		else
			return false
		end
	end

	def resource_name
		:user
	end

	def resource
		@resource ||= User.new
	end


	def devise_mapping
		@devise_mapping ||= Devise.mappings[:user]
	end

	def convert_weekdays(array)
		array.split('-')
	end

	def roles_select
		if current_user.admin?
			@roles = User.roles.keys
		else
			@roles = User.roles.keys - ["admin", "guest", "store_admin"]
		end
	end

	def select_chat_bubble(user)
		if user.admin?
			return "chat-bubble-l"
		else
			return "chat-bubble-r pull-right"
		end
	end
end

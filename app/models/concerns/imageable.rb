module Imageable
	extend ActiveSupport::Concern

	included do
		has_many :images, as: :item
	end

end
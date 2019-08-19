class ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true
  scope :last_published, -> {order("created_at DESC")}
end
